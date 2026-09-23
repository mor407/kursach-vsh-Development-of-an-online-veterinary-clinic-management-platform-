const express = require("express");
const { prisma } = require("../db/prisma");
const { requireAuth, requireRole } = require("../middleware/requireAuth");

const router = express.Router();

const ROLE_NAMES = ["client", "doctor", "admin"];

/** Список пользователей (только админ): роли и привязка к профилю врача. */
router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: { select: { id: true, name: true } },
        veterinarian: { select: { id: true, specialization: true, licenseNumber: true } },
      },
    });
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось загрузить пользователей" });
  }
});

/**
 * Смена роли. JWT не обновляется — изменённому пользователю нужно войти снова.
 * Назначение врача без профиля: обязательно body.specialization.
 * Снятие роли врача: только если нет приёмов и записей в медкарте.
 */
router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: "Некорректный id" });
  }

  const roleName = req.body.role;
  if (typeof roleName !== "string" || !ROLE_NAMES.includes(roleName)) {
    return res.status(400).json({ error: "Укажите роль: client, doctor или admin" });
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, veterinarian: true },
    });
    if (!target) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (req.user.id === userId && target.role.name === "admin" && roleName !== "admin") {
      return res.status(400).json({ error: "Нельзя снять с себя права администратора" });
    }

    const newRole = await prisma.role.findUnique({ where: { name: roleName } });
    if (!newRole) {
      return res.status(500).json({ error: "Роль не найдена в БД" });
    }

    if (roleName === "doctor") {
      const specRaw = req.body.specialization;
      const spec = specRaw != null ? String(specRaw).trim() : "";
      if (!target.veterinarian && spec.length === 0) {
        return res.status(400).json({
          error: "Для назначения врача укажите специализацию (поле specialization)",
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { roleId: newRole.id },
        });
        if (target.veterinarian) {
          const data = {};
          if (spec.length > 0) data.specialization = spec;
          if (req.body.licenseNumber !== undefined) {
            const ln = String(req.body.licenseNumber).trim();
            data.licenseNumber = ln === "" ? null : ln;
          }
          if (Object.keys(data).length > 0) {
            await tx.veterinarian.update({ where: { userId }, data });
          }
        } else {
          const ln =
            req.body.licenseNumber != null && String(req.body.licenseNumber).trim() !== ""
              ? String(req.body.licenseNumber).trim()
              : null;
          await tx.veterinarian.create({
            data: { userId, specialization: spec, licenseNumber: ln },
          });
        }
      });
    } else if (target.veterinarian) {
      const apptCount = await prisma.appointment.count({
        where: { veterinarianId: target.veterinarian.id },
      });
      const medCount = await prisma.medicalRecord.count({
        where: { veterinarianId: target.veterinarian.id },
      });
      if (apptCount > 0 || medCount > 0) {
        return res.status(409).json({
          error:
            "У этого врача есть приёмы или записи в медкарте — смена роли с врача невозможна",
        });
      }
      await prisma.$transaction([
        prisma.veterinarian.delete({ where: { userId } }),
        prisma.user.update({ where: { id: userId }, data: { roleId: newRole.id } }),
      ]);
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { roleId: newRole.id },
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: { select: { id: true, name: true } },
        veterinarian: { select: { id: true, specialization: true, licenseNumber: true } },
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось обновить пользователя" });
  }
});

module.exports = router;
