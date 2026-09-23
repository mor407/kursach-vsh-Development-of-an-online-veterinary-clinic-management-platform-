const express = require("express");
const { prisma } = require("../db/prisma");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const includeRecord = {
  pet: { select: { id: true, name: true, species: true } },
  veterinarian: {
    include: { user: { select: { fullName: true } } },
  },
  appointment: {
    select: { id: true, scheduledAt: true, status: true },
  },
};

function parseVisitedAt(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function serializeRecord(row) {
  return {
    id: row.id,
    petId: row.petId,
    veterinarianId: row.veterinarianId,
    appointmentId: row.appointmentId,
    diagnosis: row.diagnosis,
    treatmentNotes: row.treatmentNotes,
    visitedAt: row.visitedAt ? row.visitedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    pet: row.pet,
    veterinarian: {
      id: row.veterinarian.id,
      fullName: row.veterinarian.user.fullName,
      specialization: row.veterinarian.specialization,
    },
    appointment: row.appointment
      ? {
          id: row.appointment.id,
          scheduledAt: row.appointment.scheduledAt.toISOString(),
          status: row.appointment.status,
        }
      : null,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const role = req.user.role;
    const petIdFilter = req.query.petId != null ? Number(req.query.petId) : null;
    const petIdWhere =
      Number.isInteger(petIdFilter) && petIdFilter > 0 ? { petId: petIdFilter } : {};

    let where = {};

    if (role === "client") {
      where = {
        ...petIdWhere,
        pet: { ownerId: req.user.id },
      };
    } else if (role === "doctor") {
      const vet = await prisma.veterinarian.findUnique({
        where: { userId: req.user.id },
      });
      if (!vet) {
        return res.json([]);
      }
      where = {
        ...petIdWhere,
        veterinarianId: vet.id,
      };
    } else if (role === "admin") {
      where = { ...petIdWhere };
    } else {
      return res.status(403).json({ error: "Нет доступа" });
    }

    if (role === "client" && Number.isInteger(petIdFilter) && petIdFilter > 0) {
      const pet = await prisma.pet.findFirst({
        where: { id: petIdFilter, ownerId: req.user.id },
      });
      if (!pet) {
        return res.status(403).json({ error: "Питомец не найден" });
      }
    }

    const rows = await prisma.medicalRecord.findMany({
      where,
      include: includeRecord,
      orderBy: { createdAt: req.query.order === "asc" ? "asc" : "desc" },
    });

    res.json(rows.map(serializeRecord));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось загрузить медкарты" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== "doctor" && role !== "admin") {
      return res.status(403).json({ error: "Запись добавляет врач или администратор" });
    }

    const petId = Number(req.body.petId);
    if (!Number.isInteger(petId)) {
      return res.status(400).json({ error: "Укажите питомца" });
    }

    let veterinarianId;
    if (role === "doctor") {
      const vet = await prisma.veterinarian.findUnique({
        where: { userId: req.user.id },
      });
      if (!vet) {
        return res.status(403).json({ error: "Профиль ветеринария не найден" });
      }
      veterinarianId = vet.id;
    } else {
      veterinarianId = Number(req.body.veterinarianId);
      if (!Number.isInteger(veterinarianId)) {
        return res.status(400).json({ error: "Укажите врача" });
      }
      const v = await prisma.veterinarian.findUnique({ where: { id: veterinarianId } });
      if (!v) {
        return res.status(400).json({ error: "Врач не найден" });
      }
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(400).json({ error: "Питомец не найден" });
    }

    let appointmentId = null;
    if (req.body.appointmentId != null && String(req.body.appointmentId).trim() !== "") {
      const apId = Number(req.body.appointmentId);
      if (!Number.isInteger(apId)) {
        return res.status(400).json({ error: "Некорректный приём" });
      }
      const ap = await prisma.appointment.findUnique({
        where: { id: apId },
      });
      if (!ap || ap.petId !== petId) {
        return res.status(400).json({ error: "Приём не найден или не относится к питомцу" });
      }
      if (role === "doctor" && ap.veterinarianId !== veterinarianId) {
        return res.status(403).json({ error: "Нельзя привязать чужой приём" });
      }
      const existing = await prisma.medicalRecord.findUnique({
        where: { appointmentId: apId },
      });
      if (existing) {
        return res.status(409).json({ error: "У этого приёма уже есть запись в медкарте" });
      }
      appointmentId = apId;
    }

    const diagnosis =
             req.body.diagnosis != null && String(req.body.diagnosis).trim() !== ""
        ? String(req.body.diagnosis).trim()
        : null;
    const treatmentNotes =
      req.body.treatmentNotes != null && String(req.body.treatmentNotes).trim() !== ""
        ? String(req.body.treatmentNotes).trim()
        : null;

    if (!diagnosis && !treatmentNotes) {
      return res.status(400).json({ error: "Укажите диагноз и/или назначения" });
    }

    const visitedAt = parseVisitedAt(req.body.visitedAt);

    const row = await prisma.medicalRecord.create({
      data: {
        petId,
        veterinarianId,
        appointmentId,
        diagnosis,
        treatmentNotes,
        visitedAt,
      },
      include: includeRecord,
    });

    res.status(201).json(serializeRecord(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось сохранить запись" });
  }
});

async function assertRecordAccess(recordId, req) {
  const id = Number(recordId);
  if (!Number.isInteger(id)) {
    return { status: 400, message: "Некорректный id" };
  }
  const row = await prisma.medicalRecord.findUnique({
    where: { id },
    include: { pet: true },
  });
  if (!row) {
    return { status: 404, message: "Запись не найдена" };
  }

  const role = req.user.role;
  if (role === "admin") {
    return { row };
  }
  if (role === "doctor") {
    const vet = await prisma.veterinarian.findUnique({
      where: { userId: req.user.id },
    });
    if (!vet || row.veterinarianId !== vet.id) {
      return { status: 403, message: "Нет доступа" };
    }
    return { row };
  }
  return { status: 403, message: "Нет доступа" };
}

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const check = await assertRecordAccess(req.params.id, req);
    if (check.status) {
      return res.status(check.status).json({ error: check.message });
    }

    const diagnosis =
      req.body.diagnosis !== undefined
        ? req.body.diagnosis != null && String(req.body.diagnosis).trim() !== ""
          ? String(req.body.diagnosis).trim()
          : null
        : undefined;
    const treatmentNotes =
      req.body.treatmentNotes !== undefined
        ? req.body.treatmentNotes != null && String(req.body.treatmentNotes).trim() !== ""
          ? String(req.body.treatmentNotes).trim()
          : null
        : undefined;

    let visitedAt;
    if (req.body.visitedAt !== undefined) {
      visitedAt = parseVisitedAt(req.body.visitedAt);
    }

    const data = {};
    if (diagnosis !== undefined) data.diagnosis = diagnosis;
    if (treatmentNotes !== undefined) data.treatmentNotes = treatmentNotes;
    if (visitedAt !== undefined) data.visitedAt = visitedAt;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Нет полей для обновления" });
    }

    const updated = await prisma.medicalRecord.update({
      where: { id: check.row.id },
      data,
      include: includeRecord,
    });
    res.json(serializeRecord(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось обновить запись" });
  }
});

module.exports = router;
