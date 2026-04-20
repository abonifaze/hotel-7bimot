const express = require('express');
const db = require('../database/db');
const { autenticar, soloAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', autenticar, (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, u.nombre AS registrado_por
    FROM movimientos m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    ORDER BY m.created_at DESC
  `).all();
  res.json(rows);
});

router.get('/stats', autenticar, (req, res) => {
  const ingresos = db.prepare("SELECT COUNT(*) AS n FROM movimientos WHERE tipo = 'Ingreso'").get().n;
  const salidas  = db.prepare("SELECT COUNT(*) AS n FROM movimientos WHERE tipo = 'Salida'").get().n;
  res.json({ total_ingresos: ingresos, total_salidas: salidas, activos: Math.max(0, ingresos - salidas) });
});

router.post('/', autenticar, (req, res) => {
  const { tipo, nombre_huesped, cedula, habitacion, fecha_hora, tipo_pago, monto, observaciones } = req.body;

  if (!tipo || !nombre_huesped || !cedula || !habitacion) {
    return res.status(400).json({ error: 'Nombre, cédula y habitación son obligatorios' });
  }
  if (!['Ingreso', 'Salida'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de movimiento inválido' });
  }

  const result = db.prepare(`
    INSERT INTO movimientos (tipo, nombre_huesped, cedula, habitacion, fecha_hora, tipo_pago, monto, observaciones, usuario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tipo, nombre_huesped.trim(), cedula.trim(), habitacion.trim(),
         fecha_hora || new Date().toISOString(), tipo_pago || 'Efectivo',
         parseFloat(monto) || 0, observaciones?.trim() || '', req.usuario.id);

  const nuevo = db.prepare(`
    SELECT m.*, u.nombre AS registrado_por
    FROM movimientos m LEFT JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(nuevo);
});

router.delete('/:id', autenticar, soloAdmin, (req, res) => {
  const mov = db.prepare('SELECT id FROM movimientos WHERE id = ?').get(req.params.id);
  if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });

  db.prepare('DELETE FROM movimientos WHERE id = ?').run(req.params.id);
  res.json({ mensaje: 'Movimiento eliminado correctamente' });
});

module.exports = router;
