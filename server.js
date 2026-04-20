const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/movimientos', require('./routes/movimientos'));
app.use('/api/usuarios',    require('./routes/usuarios'));

app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'hotel_7bimot.html')));

require('./database/db').initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
      console.log(`   Login:     http://localhost:${PORT}/`);
      console.log(`   Dashboard: http://localhost:${PORT}/dashboard\n`);
    });
  })
  .catch(err => {
    console.error('Error al inicializar la base de datos:', err);
    process.exit(1);
  });
