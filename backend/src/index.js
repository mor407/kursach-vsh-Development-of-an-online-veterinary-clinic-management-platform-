const express = require("express");
const cors = require("cors");
const { PORT } = require("./config");

const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const appointmentsRoutes = require("./routes/appointments");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api", meRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "vetclinic-prototype-api", mode: "demo" });
});

app.listen(PORT, () => {
  console.log(`Prototype API: http://localhost:${PORT}`);
  console.log("Демо-вход: demo@vet.local / demo123");
});
