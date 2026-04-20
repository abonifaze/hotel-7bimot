const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'hotel7bimot_jwt_secret_2026';

function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  try {
    req.usuario = jwt.verify(auth.split(' ')[1], SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido: solo administradores' });
  }
  next();
}

module.exports = { autenticar, soloAdmin, SECRET };
