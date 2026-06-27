const router = require('express').Router();
const pool  = require('../db/pool');
const auth  = require('../middleware/auth');
const roles = require('../middleware/roles');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM configuracion ORDER BY clave');
  res.json(rows);
});

router.put('/', auth, roles('admin'), async (req, res) => {
  try {
    const { config } = req.body;
    for (const item of config) {
      await pool.query(
        `INSERT INTO configuracion (clave,valor) VALUES ($1,$2)
         ON CONFLICT (clave) DO UPDATE SET valor=$2,updated_at=NOW()`,
        [item.clave, item.valor]);
    }
    res.json({ message: 'Configuración guardada' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;