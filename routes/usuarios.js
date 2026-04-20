const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../database/db');
const { autenticar, soloAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', autenticar, soloAdmin, (req, res) => {
  const usuarios = db.prepare(
    'SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios ORDER BY created_at DESC'
  ).all();
  res.json(usuarios);
});

router.post('/', autenticar, soloAdmin, (req, res) => {
  const { nombre, usuario, password, rol } = req.body;

  if (!nombre || !usuario || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!['admin', 'empleado'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Use "admin" o "empleado"' });
  }

  const existe = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario);
  if (existe) return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)'
  ).run(nombre.trim(), usuario.trim(), hash, rol);

  res.status(201).json({ id: result.lastInsertRowid, nombre, usuario, rol, activo: 1 });
});

router.put('/:id', autenticar, soloAdmin, (req, res) => {
  const id   = parseInt(req.params.id);
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { nombre, password, rol, activo } = req.body;

  db.prepare(`UPDATE usuarios SET
    nombre   = ?,
    password = ?,
    rol      = ?,
    activo   = ?
    WHERE id = ?
  `).run(
    nombre   !== undefined ? nombre.trim()            : user.nombre,
    password !== undefined ? bcrypt.hashSync(password, 10) : user.password,
    rol      !== undefined ? rol                      : user.rol,
    activo   !== undefined ? (activo ? 1 : 0)         : user.activo,
    id
  );

  res.json({ mensaje: 'Usuario actualizado correctamente' });
});

router.delete('/:id', autenticar, soloAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.usuario.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }

  const user = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  res.json({ mensaje: 'Usuario eliminado correctamente' });
});

module.exports = router;
