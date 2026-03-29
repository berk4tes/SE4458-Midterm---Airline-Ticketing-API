const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and get JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: adminpass
 *     responses:
 *       200:
 *         description: JWT token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 token:   { type: string,  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxMDAwMDAwMCwiZXhwIjoxNzEwMDI4ODAwfQ.abc123" }
 *                 role:    { type: string,  example: "admin" }
 *             example:
 *               success: true
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.abc123"
 *               role: "admin"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Invalid username or password"
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'username and password are required' });
  }

  const result = await db.query(
    `SELECT id, username, role FROM users WHERE username = $1 AND password = $2`,
    [username, password]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }

  const user = result.rows[0];
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.status(200).json({ success: true, token, role: user.role });
});

module.exports = router;
