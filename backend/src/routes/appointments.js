const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { buildMockAppointments } = require("../data/demo");

const router = express.Router();

function stripInternal(row) {
  const { _ownerId, ...rest } = row;
  return rest;
}

router.get("/", requireAuth, (req, res) => {
  try {
    const role = req.user.role;
    let rows = buildMockAppointments();

    if (role === "client") {
      rows = rows.filter((r) => r._ownerId === req.user.id);
    } else if (role === "admin") {
      // в демо те же данные
    } else if (role === "doctor") {
      rows = rows.filter((r) => r.veterinarianId === 1);
    } else {
      return res.status(403).json({ error: "Нет доступа" });
    }

    const order = req.query.order === "asc" ? 1 : -1;
    rows = [...rows].sort(
      (a, b) => order * (new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    );

    res.json(rows.map(stripInternal));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Не удалось загрузить записи" });
  }
});

module.exports = router;
