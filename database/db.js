const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'hotel7bimot.db');
let _db = null;

function save() {
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

function toObj(columns, row) {
  return Object.fromEntries(columns.map((c, i) => [c, row[i]]));
}

function queryOne(sql, params) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function queryAll(sql, params) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function runSql(sql, params) {
  _db.run(sql, params.length ? params : undefined);
  save();
  const stmt = _db.prepare('SELECT last_insert_rowid() AS id');
  stmt.step();
  const { id } = stmt.getAsObject();
  stmt.free();
  return { lastInsertRowid: id };
}

// Wrapper con la misma API que better-sqlite3
const db = {
  prepare(sql) {
    return {
      get(...args)  { return queryOne(sql, args); },
      all(...args)  { return queryAll(sql, args); },
      run(...args)  { return runSql(sql, args); }
    };
  },
  pragma() {}
};

async function initDb() {
  const SQL = await initSqlJs();

  _db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  _db.run('PRAGMA foreign_keys = ON');

  _db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT    NOT NULL,
    usuario    TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    rol        TEXT    NOT NULL CHECK(rol IN ('admin','empleado')),
    activo     INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS movimientos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo           TEXT    NOT NULL CHECK(tipo IN ('Ingreso','Salida')),
    nombre_huesped TEXT    NOT NULL,
    cedula         TEXT    NOT NULL,
    habitacion     TEXT    NOT NULL,
    fecha_hora     DATETIME NOT NULL,
    tipo_pago      TEXT    NOT NULL,
    monto          REAL    NOT NULL DEFAULT 0,
    observaciones  TEXT    DEFAULT '',
    usuario_id     INTEGER,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  save();

  const stmt = _db.prepare('SELECT COUNT(*) AS n FROM usuarios');
  stmt.step();
  const { n } = stmt.getAsObject();
  stmt.free();

  if (n === 0) {
    _db.run('INSERT INTO usuarios (nombre,usuario,password,rol) VALUES (?,?,?,?)',
      ['Administrador', 'admin', bcrypt.hashSync('admin123', 10), 'admin']);
    _db.run('INSERT INTO usuarios (nombre,usuario,password,rol) VALUES (?,?,?,?)',
      ['Empleado Demo', 'empleado', bcrypt.hashSync('emp123', 10), 'empleado']);
    save();
    console.log('Usuarios creados por defecto:');
    console.log('  admin    / admin123  (Administrador)');
    console.log('  empleado / emp123    (Empleado)');
  }

  return db;
}

module.exports = db;
module.exports.initDb = initDb;
