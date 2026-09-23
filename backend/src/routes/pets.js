const express = require("express");
const { prisma } = require("../db/prisma");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

function serializePet(row, withOwner) {
  const base = {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    species: row.species,
    breed: row.breed,
    birthDate: row.birthDate ? row.birthDate.toISOString().slice(0, 10) : null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
  if (withOwner && row.owner) {
    base.owner = {
      id: row.owner.id,
      fullName: row.owner.fullName,
      email: row.owner.email,
    };
  }
  return base;
}

function parsePetBody(body) {
  const name = body.name != null ? String(body.name).trim() : "";
  const species = body.species != null ? String(body.species).trim() : "";
  const breed =
    body.breed != null && String(body.breed).trim() !== ""
      ? String(body.breed).trim().slice(0, 120)
      : null;
  const notes =
    body.notes != null && String(body.notes).trim() !== "" ? String(body.notes).trim() : null;

  let birthDate = null;
  if (body.birthDate != null && String(body.birthDate).trim() !== "") {
    const d = new Date(`${String(body.birthDate).trim()}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return { error: "Некорректная дата рождения" };
    }
    birthDate = d;
  }

  if (!name || name.length > 100) {
    return { error: "Укажите кличку питомца (до 100 символов)" };
  }
  if (!species || species.length > 80) {
    return { error: "Укажите вид животного" };
  }

  return { name, species, breed, birthDate, notes };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "doctor") {
      return res.status(403).json({ error: "Раздел доступен клиентам и администратору" });
    }

    if (role === "admin") {
      const pets = await prisma.pet.findMany({
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: [{ ownerId: "asc" }, { createdAt: "desc" }],
      });
      return res.json(pets.map((p) => serializePet(p, true)));
    }

    const pets = await prisma.pet.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(pets.map((p) => serializePet(p, false)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось загрузить питомцев" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "doctor") {
      return res.status(403).json({ error: "Питомцев добавляют клиенты" });
    }
    if (req.user.role === "admin") {
      return res.status(403).json({
        error: "Войдите под учётной записью клиента, чтобы добавить питомца",
      });
    }
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const parsed = parsePetBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const row = await prisma.pet.create({
      data: {
        ownerId: req.user.id,
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed,
        birthDate: parsed.birthDate,
        notes: parsed.notes,
      },
    });

    res.status(201).json(serializePet(row, false));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось добавить питомца" });
  }
});

async function assertCanAccessPet(petId, req) {
  const id = Number(petId);
  if (!Number.isInteger(id)) {
    return { status: 400, error: "Некорректный id" };
  }
  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet) {
    return { status: 404, error: "Питомец не найден" };
  }
  if (req.user.role === "doctor") {
    return { status: 403, error: "Нет доступа" };
  }
  if (req.user.role !== "admin" && pet.ownerId !== req.user.id) {
    return { status: 403, error: "Нет доступа" };
  }
  return { pet, id };
}

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const check = await assertCanAccessPet(req.params.id, req);
    if (check.error) {
      return res.status(check.status).json({ error: check.error });
    }

    const parsed = parsePetBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const row = await prisma.pet.update({
      where: { id: check.id },
      data: {
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed,
        birthDate: parsed.birthDate,
        notes: parsed.notes,
      },
      include:
        req.user.role === "admin"
          ? { owner: { select: { id: true, fullName: true, email: true } } }
          : undefined,
    });

    res.json(serializePet(row, req.user.role === "admin"));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось обновить питомца" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const check = await assertCanAccessPet(req.params.id, req);
    if (check.error) {
      return res.status(check.status).json({ error: check.error });
    }

    await prisma.pet.delete({ where: { id: check.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2003") {
      return res.status(409).json({
        error: "Нельзя удалить: есть связанные записи на приём или медданные",
      });
    }
    console.error(e);
    res.status(500).json({ error: "Не удалось удалить питомца" });
  }
});

module.exports = router;
