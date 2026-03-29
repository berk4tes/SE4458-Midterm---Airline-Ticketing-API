const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const ticketController = require('../controllers/ticket.controller');

const router = express.Router();

/**
 * @openapi
 * /api/v1/tickets/buy:
 *   post:
 *     tags: [Tickets]
 *     summary: Buy ticket(s) for a flight (auth required)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuyTicketRequest'
 *     responses:
 *       201:
 *         description: Tickets booked successfully – returns ticket numbers per passenger
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               tickets:
 *                 - passengerName: "John Doe"
 *                   ticketNumber: "TKT-a1b2c3d4"
 *                 - passengerName: "Jane Doe"
 *                   ticketNumber: "TKT-e5f6g7h8"
 *       200:
 *         description: Sold out – not enough seats available
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Sold out"
 *               availableSeats: 1
 *               requested: 2
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
 *       404:
 *         description: Flight not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Flight not found"
 */
router.post('/buy', requireAuth(), ticketController.buyTicket);

/**
 * @openapi
 * /api/v1/tickets/checkin:
 *   post:
 *     tags: [Tickets]
 *     summary: Check in a passenger (no auth, assigns seat)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckInRequest'
 *     responses:
 *       200:
 *         description: Check-in successful – returns assigned seat number
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Check-in successful"
 *               passengerName: "John Doe"
 *               flightNumber: "TK101"
 *               seatNumber: 5
 *       400:
 *         description: Validation error or passenger already checked in
 *         content:
 *           application/json:
 *             examples:
 *               validation:
 *                 summary: Missing required field
 *                 value:
 *                   success: false
 *                   message: "passengerName is required"
 *               alreadyCheckedIn:
 *                 summary: Passenger already checked in
 *                 value:
 *                   success: false
 *                   message: "already checked in"
 *       404:
 *         description: Booking not found for this passenger / flight / date combination
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Booking not found"
 */
router.post('/checkin', ticketController.checkIn);

module.exports = router;
