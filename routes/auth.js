const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database/db');
const { autenticar, SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  const user = db.prepare(
    'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1'
  ).get(usuario);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const payload = { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol };
  const token = jwt.sign(payload, SECRET, { expiresIn: '8h' });

  res.json({ token, usuario: payload });
});

router.get('/me', autenticar, (req, res) => {
  const user = db.prepare(
    'SELECT id, nombre, usuario, rol FROM usuarios WHERE id = ?'
  ).get(req.usuario.id);
  res.json(user || req.usuario);
});

module.exports = router;
