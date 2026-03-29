const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const flightController = require('../controllers/flight.controller');
const db = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /api/v1/flights:
 *   post:
 *     tags: [Flights]
 *     summary: Add a flight to the schedule
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddFlightRequest'
 *     responses:
 *       201:
 *         description: Flight added successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               flight:
 *                 id: 1
 *                 flightNumber: "TK101"
 *                 dateFrom: "2026-04-10"
 *                 dateTo: "2026-04-10"
 *                 airportFrom: "IST"
 *                 airportTo: "LHR"
 *                 duration: 225
 *                 capacity: 180
 *                 availableSeats: 180
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "flightNumber is required"
 *       401:
 *         description: Unauthorized – missing or invalid JWT
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "No token provided"
 *       409:
 *         description: Flight number already exists
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Flight number TK101 already exists"
 */
router.post('/', requireAuth(), flightController.addFlight);

/**
 * @openapi
 * /api/v1/flights/upload:
 *   post:
 *     tags: [Flights]
 *     summary: Add flights from a CSV file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "CSV file with columns: flight_number, date_from, date_to, airport_from, airport_to, duration, capacity"
 *     responses:
 *       207:
 *         description: File processed – check fileProcessingStatus for per-row results
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               fileProcessingStatus:
 *                 total: 3
 *                 success: 2
 *                 failed: 1
 *                 errors:
 *                   - row: 3
 *                     error: "Flight number TK301 already exists"
 *       400:
 *         description: Bad request or CSV parse error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "No file uploaded or file is empty"
 *       401:
 *         description: Unauthorized – missing or invalid JWT
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "No token provided"
 */
router.post('/upload', requireAuth(), upload.single('file'), flightController.addFlightByFile);

/**
 * @openapi
 * /api/v1/flights:
 *   get:
 *     tags: [Flights]
 *     summary: Query available flights (no auth, 3 calls/day limit)
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-01"
 *       - in: query
 *         name: dateTo
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-31"
 *       - in: query
 *         name: airportFrom
 *         required: true
 *         schema:
 *           type: string
 *           example: "IST"
 *       - in: query
 *         name: airportTo
 *         required: true
 *         schema:
 *           type: string
 *           example: "LHR"
 *       - in: query
 *         name: numberOfPeople
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 2
 *       - in: query
 *         name: oneWay
 *         schema:
 *           type: boolean
 *           default: true
 *           example: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of available flights. For round-trip queries both outbound and return arrays are returned.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               outbound:
 *                 - flightNumber: "TK101"
 *                   dateFrom: "2026-04-10"
 *                   dateTo: "2026-04-10"
 *                   airportFrom: "IST"
 *                   airportTo: "LHR"
 *                   duration: 225
 *                   availableSeats: 175
 *               total: 1
 *               page: 1
 *               limit: 10
 *       400:
 *         description: Validation error – missing required query parameters
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "airportFrom is required"
 *       429:
 *         description: Daily query limit exceeded (3 queries per IP per day)
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Daily query limit exceeded. You have used all 3 free queries for today."
 */
router.get('/', flightController.queryFlights);

/**
 * @openapi
 * /api/v1/flights/{flightNumber}/passengers:
 *   get:
 *     tags: [Flights]
 *     summary: Get passenger list for a flight (auth required, paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flightNumber
 *         required: true
 *         schema:
 *           type: string
 *           example: "TK101"
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-01"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated passenger list with seat numbers and booking status
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               flightNumber: "TK101"
 *               date: "2026-04-10"
 *               passengers:
 *                 - passengerName: "John Doe"
 *                   ticketNumber: "TKT-a1b2c3d4"
 *                   status: "checked_in"
 *                   seatNumber: 1
 *                 - passengerName: "Jane Doe"
 *                   ticketNumber: "TKT-e5f6g7h8"
 *                   status: "booked"
 *                   seatNumber: null
 *               total: 2
 *               page: 1
 *               limit: 10
 *       401:
 *         description: Unauthorized – missing or invalid JWT
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "No token provided"
 *       404:
 *         description: Flight not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Flight not found"
 */
// ── DEBUG: raw DB inspection (no auth, remove before production) ──────────────
router.get('/debug', async (req, res) => {
  try {
    const flights = await db.query('SELECT * FROM flights LIMIT 5');
    const rateRows = await db.query('SELECT * FROM query_rate_limits ORDER BY id DESC LIMIT 5');
    res.json({
      flightCount: flights.rowCount,
      flights: flights.rows,
      recentRateLimitRows: rateRows.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DEBUG: clear rate-limit counters (no auth, remove before production) ──────
router.delete('/debug/rate-limit', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM query_rate_limits');
    res.json({ success: true, deletedRows: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:flightNumber/passengers', requireAuth(), flightController.getPassengerList);

module.exports = router;
