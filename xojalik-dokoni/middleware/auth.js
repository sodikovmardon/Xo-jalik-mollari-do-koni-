function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: "Ruxsat yo'q. Iltimos, tizimga kiring." });
}

module.exports = { requireAdmin };
