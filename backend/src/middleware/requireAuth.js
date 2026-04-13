const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

/**
 * Authorization: Bearer <jwt> → req.user = { id, roleId, role }
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Требуется авторизация (Bearer token)" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Пустой токен" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) {
      return res.status(401).json({ error: "Некорректный токен" });
    }
    req.user = {
      id,
      roleId: payload.roleId,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Сессия недействительна или истекла" });
  }
}

module.exports = { requireAuth };
