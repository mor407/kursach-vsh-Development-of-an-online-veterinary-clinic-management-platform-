require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const servicesRoutes = require("./routes/services");
const petsRoutes = require("./routes/pets");
const veterinariansRoutes = require("./routes/veterinarians");
const appointmentsRoutes = require("./routes/appointments");
const medicalRecordsRoutes = require("./routes/medicalRecords");
const usersRoutes = require("./routes/users");

app.use("/api/auth", authRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/pets", petsRoutes);
app.use("/api/veterinarians", veterinariansRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/medical-records", medicalRecordsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api", meRoutes);

app.get("/api/health", async (_req, res) => {
  const payload = { ok: true, service: "vet-clinic-api" };
  try {
    const { prisma } = require("./db/prisma");
    await prisma.$queryRaw`SELECT 1`;
    payload.db = "connected";
  } catch {
    payload.db = "unavailable";
  }
  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
