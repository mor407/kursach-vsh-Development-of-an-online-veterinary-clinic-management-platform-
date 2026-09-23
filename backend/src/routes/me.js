const express = require("express");
const { prisma } = require("../db/prisma");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: { select: { id: true, name: true } },
        veterinarian: {
          select: {
            id: true,
            specialization: true,
            licenseNumber: true,
          },
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
