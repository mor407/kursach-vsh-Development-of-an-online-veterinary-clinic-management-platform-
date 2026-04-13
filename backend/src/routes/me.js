const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { DEMO_USER } = require("../data/demo");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  if (req.user.id !== DEMO_USER.id) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  res.json({
    id: DEMO_USER.id,
    email: DEMO_USER.email,
    fullName: DEMO_USER.fullName,
    phone: DEMO_USER.phone,
    role: { id: DEMO_USER.role.id, name: DEMO_USER.role.name },
  });
});

module.exports = router;
