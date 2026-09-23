const express = require("express");
const { prisma } = require("../db/prisma");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const WORKING_HOURS_TEXT = "Пн–Пт 08:00–21:00, Сб 09:00–18:00, Вс 10:00–16:00";

function isWithinClinicWorkingHours(date) {
  const day = date.getDay(); // 0: Sunday ... 6: Saturday
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (day >= 1 && day <= 5) {
    return minutes >= 8 * 60 && minutes < 21 * 60;
  }
  if (day === 6) {
    return minutes >= 9 * 60 && minutes < 18 * 60;
  }
  return minutes >= 10 * 60 && minutes < 16 * 60;
}

const includeAppointment = {
  pet: { select: { id: true, name: true, species: true, ownerId: true } },
  service: { select: { id: true, name: true, durationMinutes: true, price: true } },
  veterinarian: {
    include: {
      user: { select: { id: true, fullName: true } },
    },
  },
};

function serializeAppointment(row) {
  const petPublic = {
    id: row.pet.id,
    name: row.pet.name,
    species: row.pet.species,
  };
  return {
    id: row.id,
    petId: row.petId,
    veterinarianId: row.veterinarianId,
    serviceId: row.serviceId,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    clientNotes: row.clientNotes,
    createdAt: row.createdAt.toISOString(),
    pet: petPublic,
    service: {
      ...row.service,
      price: row.service.price != null ? String(row.service.price) : "0",
    },
    veterinarian: {
      id: row.veterinarian.id,
      fullName: row.veterinarian.user.fullName,
      specialization: row.veterinarian.specialization,
    },
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const role = req.user.role;
    let where = {};
    if (role === "admin") {
      where = {};
    } else if (role === "client") {
      where = { pet: { ownerId: req.user.id } };
    } else if (role === "doctor") {
      const vet = await prisma.veterinarian.findUnique({
        where: { userId: req.user.id },
      });
      if (!vet) {
        return res.json([]);
      }
      where = { veterinarianId: vet.id };
    } else {
      return res.status(403).json({ error: "Нет доступа" });
    }

    const status = req.query.status;
    const finalWhere =
      typeof status === "string" && STATUSES.includes(status)
        ? { ...where, status }
        : where;

    const rows = await prisma.appointment.findMany({
      where: finalWhere,
      include: includeAppointment,
      orderBy: { scheduledAt: req.query.order === "asc" ? "asc" : "desc" },
    });
    res.json(rows.map(serializeAppointment));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось загрузить записи" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Запись оформляет клиент" });
    }

    const petId = Number(req.body.petId);
    const serviceId = Number(req.body.serviceId);
    const veterinarianId = Number(req.body.veterinarianId);
    if (!Number.isInteger(petId) || !Number.isInteger(serviceId) || !Number.isInteger(veterinarianId)) {
      return res.status(400).json({ error: "Укажите питомца, услугу и врача" });
    }

    const scheduledRaw = req.body.scheduledAt;
    if (scheduledRaw == null || String(scheduledRaw).trim() === "") {
      return res.status(400).json({ error: "Укажите дату и время приёма" });
    }
    const scheduledAt = new Date(String(scheduledRaw));
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ error: "Некорректная дата" });
    }
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      return res.status(400).json({ error: "Выберите будущую дату и время" });
    }
    if (!isWithinClinicWorkingHours(scheduledAt)) {
      return res.status(400).json({
        error: `Запись доступна только в рабочие часы клиники: ${WORKING_HOURS_TEXT}`,
      });
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || pet.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Питомец не найден или чужой" });
    }

    const [service, vet] = await Promise.all([
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.veterinarian.findUnique({ where: { id: veterinarianId } }),
    ]);
    if (!service || !vet) {
      return res.status(400).json({ error: "Услуга или врач не найдены" });
    }

    const clientNotes =
      req.body.clientNotes != null && String(req.body.clientNotes).trim() !== ""
        ? String(req.body.clientNotes).trim()
        : null;

    const row = await prisma.appointment.create({
      data: {
        petId,
        serviceId,
        veterinarianId,
        scheduledAt,
        status: "pending",
        clientNotes,
      },
      include: includeAppointment,
    });

    res.status(201).json(serializeAppointment(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось создать запись" });
  }
});

async function loadAppointmentForAccess(id, req) {
  const apId = Number(id);
  if (!Number.isInteger(apId)) {
    return { error: 400, message: "Некорректный id" };
  }
  const row = await prisma.appointment.findUnique({
    where: { id: apId },
    include: includeAppointment,
  });
  if (!row) {
    return { error: 404, message: "Запись не найдена" };
  }

  const role = req.user.role;
  if (role === "admin") {
    return { row };
  }
  if (role === "client") {
    if (row.pet.ownerId !== req.user.id) {
      return { error: 403, message: "Нет доступа" };
    }
    return { row };
  }
  if (role === "doctor") {
    const vet = await prisma.veterinarian.findUnique({
      where: { userId: req.user.id },
    });
    if (!vet || row.veterinarianId !== vet.id) {
      return { error: 403, message: "Нет доступа" };
    }
    return { row };
  }
  return { error: 403, message: "Нет доступа" };
}

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const check = await loadAppointmentForAccess(req.params.id, req);
    if (check.error) {
      return res.status(check.error).json({ error: check.message });
    }
    const { row } = check;
    const role = req.user.role;

    const data = {};

    if (req.body.clientNotes !== undefined) {
      if (role !== "client" && role !== "admin") {
        return res.status(403).json({ error: "Комментарий меняет клиент" });
      }
      if (role === "client" && (row.status === "completed" || row.status === "cancelled")) {
        return res.status(400).json({ error: "Запись закрыта для правок" });
      }
      const v = req.body.clientNotes;
      data.clientNotes =
        v != null && String(v).trim() !== "" ? String(v).trim() : null;
    }

    if (req.body.scheduledAt !== undefined) {
      if (role !== "client" && role !== "admin" && role !== "doctor") {
        return res.status(403).json({ error: "Нет прав на перенос" });
      }
      if (role === "client" && (row.status === "completed" || row.status === "cancelled")) {
        return res.status(400).json({ error: "Нельзя перенести завершённую или отменённую запись" });
      }
      const d = new Date(String(req.body.scheduledAt));
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "Некорректная дата" });
      }
      if (d.getTime() < Date.now() - 60_000) {
        return res.status(400).json({ error: "Выберите будущую дату и время" });
      }
      if (!isWithinClinicWorkingHours(d)) {
        return res.status(400).json({
          error: `Запись доступна только в рабочие часы клиники: ${WORKING_HOURS_TEXT}`,
        });
      }
      data.scheduledAt = d;
    }

    if (req.body.status !== undefined) {
      const st = String(req.body.status);
      if (!STATUSES.includes(st)) {
        return res.status(400).json({ error: "Некорректный статус" });
      }
      if (role === "client") {
        if (st !== "cancelled") {
          return res.status(403).json({ error: "Клиент может только отменить запись" });
        }
        if (row.status === "completed") {
          return res.status(400).json({ error: "Нельзя отменить завершённый приём" });
        }
        data.status = "cancelled";
      } else if (role === "doctor" || role === "admin") {
        data.status = st;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Нет полей для обновления" });
    }

    const updated = await prisma.appointment.update({
      where: { id: row.id },
      data,
      include: includeAppointment,
    });
    res.json(serializeAppointment(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось обновить запись" });
  }
});

module.exports = router;
