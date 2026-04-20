const express = require('express');
const db = require('../database/db');
const { autenticar, soloAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', autenticar, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT m.*, u.nombre AS registrado_por
      FROM movimientos m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('GET /movimientos:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', autenticar, (req, res) => {
  try {
    const ingresos = db.prepare("SELECT COUNT(*) AS n FROM movimientos WHERE tipo = 'Ingreso'").get().n;
    const salidas  = db.prepare("SELECT COUNT(*) AS n FROM movimientos WHERE tipo = 'Salida'").get().n;
    res.json({ total_ingresos: ingresos, total_salidas: salidas, activos: Math.max(0, ingresos - salidas) });
  } catch (err) {
    console.error('GET /movimientos/stats:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', autenticar, (req, res) => {
  try {
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
  } catch (err) {
    console.error('POST /movimientos:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', autenticar, soloAdmin, (req, res) => {
  try {
    const mov = db.prepare('SELECT id FROM movimientos WHERE id = ?').get(req.params.id);
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
    db.prepare('DELETE FROM movimientos WHERE id = ?').run(req.params.id);
    res.json({ mensaje: 'Movimiento eliminado correctamente' });
  } catch (err) {
    console.error('DELETE /movimientos:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
