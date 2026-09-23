const express = require("express");
const { prisma } = require("../db/prisma");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

/** Список врачей для записи на приём (ФИО + специализация). */
router.get("/", requireAuth, async (_req, res) => {
  try {
    const rows = await prisma.veterinarian.findMany({
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { id: "asc" },
    });
    res.json(
      rows.map((v) => ({
        id: v.id,
        fullName: v.user.fullName,
        specialization: v.specialization,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось загрузить врачей" });
  }
});

module.exports = router;
