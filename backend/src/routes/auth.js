const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../db/prisma");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-in-production";
const SALT_ROUNDS = 10;

router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Укажите email, пароль и ФИО" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Пароль не короче 6 символов" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (exists) {
      return res.status(409).json({ error: "Пользователь с таким email уже зарегистрирован" });
    }

    const role = await prisma.role.findUnique({ where: { name: "client" } });
    if (!role) {
      return res.status(503).json({
        error: "Роли не созданы. Выполните в папке backend: npm run db:seed",
      });
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        fullName: String(fullName).trim(),
        phone: phone ? String(phone).trim() : null,
        roleId: role.id,
      },
      include: { role: true },
    });

    const token = jwt.sign(
      { sub: user.id, roleId: user.roleId, role: user.role.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: { id: user.role.id, name: user.role.name },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = jwt.sign(
      { sub: user.id, roleId: user.roleId, role: user.role.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: { id: user.role.id, name: user.role.name },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
