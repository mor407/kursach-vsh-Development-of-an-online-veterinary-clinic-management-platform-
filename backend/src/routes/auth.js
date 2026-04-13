const express = require("express");
const jwt = require("jsonwebtoken");
const { DEMO_USER } = require("../data/demo");
const { JWT_SECRET } = require("../config");

const router = express.Router();

router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (emailNorm !== DEMO_USER.email || String(password) !== DEMO_USER.password) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = jwt.sign(
      { sub: DEMO_USER.id, roleId: DEMO_USER.roleId, role: DEMO_USER.role.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        fullName: DEMO_USER.fullName,
        role: { id: DEMO_USER.role.id, name: DEMO_USER.role.name },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
