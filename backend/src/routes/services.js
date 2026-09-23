const express = require("express");
const { prisma } = require("../db/prisma");
const { requireAuth, requireRole } = require("../middleware/requireAuth");

const router = express.Router();

const SORT_FIELDS = ["name", "price", "durationMinutes"];

function serializeService(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    price: row.price != null ? String(row.price) : "0",
  };
}

function parseServiceBody(body) {
  const name = body.name != null ? String(body.name).trim() : "";
  const description =
    body.description != null && String(body.description).trim() !== ""
      ? String(body.description).trim()
      : null;
  const durationMinutes = Number(body.durationMinutes);
  const price = Number(body.price);
  if (!name || name.length > 150) {
    return { error: "Укажите название услуги (до 150 символов)" };
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 24 * 60) {
    return { error: "Длительность — целое число минут от 1 до 1440" };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Цена должна быть неотрицательным числом" };
  }
  return { name, description, durationMinutes, price };
}

/** Публичный каталог: поиск по названию и сортировка */
router.get("/", async (req, res) => {
  try {
    const q = req.query.q != null ? String(req.query.q).trim() : "";
    const sort = SORT_FIELDS.includes(String(req.query.sort)) ? String(req.query.sort) : "name";
    const order = String(req.query.order) === "desc" ? "desc" : "asc";

    const where =
      q.length > 0
        ? {
            name: { contains: q, mode: "insensitive" },
          }
        : {};

    const rows = await prisma.service.findMany({
      where,
      orderBy: { [sort]: order },
    });

    res.json(rows.map(serializeService));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось загрузить услуги" });
  }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const parsed = parseServiceBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const row = await prisma.service.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        durationMinutes: parsed.durationMinutes,
        price: parsed.price,
      },
    });
    res.status(201).json(serializeService(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось создать услугу" });
  }
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }
    const parsed = parseServiceBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const row = await prisma.service.update({
      where: { id },
      data: {
        name: parsed.name,
        description: parsed.description,
        durationMinutes: parsed.durationMinutes,
        price: parsed.price,
      },
    });
    res.json(serializeService(row));
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Услуга не найдена" });
    }
    console.error(e);
    res.status(500).json({ error: "Не удалось обновить услугу" });
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Некорректный id" });
    }
    await prisma.service.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Услуга не найдена" });
    }
    if (e.code === "P2003") {
      return res.status(409).json({
        error: "Нельзя удалить: есть связанные записи на приём",
      });
    }
    console.error(e);
    res.status(500).json({ error: "Не удалось удалить услугу" });
  }
});

module.exports = router;
