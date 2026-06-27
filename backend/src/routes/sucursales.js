const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM sucursales WHERE activa=true ORDER BY nombre');
  res.json(rows);
});
module.exports = router;