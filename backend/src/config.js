require("dotenv").config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "prototype-change-me",
  PORT: Number(process.env.PORT) || 3001,
};
