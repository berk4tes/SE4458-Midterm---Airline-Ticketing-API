const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * Buy tickets for one or more passengers on a flight.
 * Decreases available_seats by the number of passengers.
 * Returns 'sold out' if not enough seats.
 */
async function buyTicket(dto) {
  const { flightNumber, date, passengerNames } = dto;
  const count = passengerNames.length;

  // Fetch flight
  const flightRes = await db.query(
    `SELECT id, available_seats FROM flights WHERE flight_number = $1`,
    [flightNumber]
  );
  if (flightRes.rows.length === 0) {
    const error = new Error(`Flight ${flightNumber} not found`);
    error.statusCode = 404;
    throw error;
  }

  const flight = flightRes.rows[0];

  if (flight.available_seats < count) {
    return {
      success: false,
      message: 'Sold out',
      availableSeats: flight.available_seats,
      requested: count,
    };
  }

  // Insert tickets and decrease available_seats atomically
  const ticketNumbers = [];

  // Use a transaction
  const client = await (require('../db').getClient
    ? require('../db').getClient()
    : null);

  // Fallback: sequential queries (acceptable for this scale)
  for (const passengerName of passengerNames) {
    const ticketNumber = `TKT-${uuidv4().slice(0, 8).toUpperCase()}`;
    await db.query(
      `INSERT INTO tickets (ticket_number, flight_id, passenger_name, flight_date, status)
       VALUES ($1, $2, $3, $4, 'booked')`,
      [ticketNumber, flight.id, passengerName.trim(), date]
    );
    ticketNumbers.push({ passengerName: passengerName.trim(), ticketNumber });
  }

  // Decrease available seats
  await db.query(
    `UPDATE flights SET available_seats = available_seats - $1 WHERE id = $2`,
    [count, flight.id]
  );

  return {
    success: true,
    message: 'Tickets booked successfully',
    tickets: ticketNumbers,
  };
}

/**
 * Check in a passenger for a flight.
 * Assigns the next available seat number (simple sequential numbering).
 */
async function checkIn(dto) {
  const { flightNumber, date, passengerName } = dto;

  // Find the flight
  const flightRes = await db.query(
    `SELECT id FROM flights WHERE flight_number = $1`,
    [flightNumber]
  );
  if (flightRes.rows.length === 0) {
    const error = new Error(`Flight ${flightNumber} not found`);
    error.statusCode = 404;
    throw error;
  }

  const flightId = flightRes.rows[0].id;

  // Find the ticket for this passenger on this flight and date
  const ticketRes = await db.query(
    `SELECT id, status, seat_number FROM tickets
     WHERE flight_id = $1 AND flight_date = $2 AND LOWER(passenger_name) = LOWER($3)`,
    [flightId, date, passengerName.trim()]
  );

  if (ticketRes.rows.length === 0) {
    const error = new Error(`No booking found for passenger '${passengerName}' on flight ${flightNumber} on ${date}`);
    error.statusCode = 404;
    throw error;
  }

  const ticket = ticketRes.rows[0];

  if (ticket.status === 'checked_in') {
    return {
      success: false,
      message: `Passenger '${passengerName}' is already checked in`,
      seatNumber: ticket.seat_number,
    };
  }

  // Assign next seat number: count checked-in passengers on this flight + 1
  const seatRes = await db.query(
    `SELECT COUNT(*) FROM tickets WHERE flight_id = $1 AND flight_date = $2 AND status = 'checked_in'`,
    [flightId, date]
  );
  const nextSeat = parseInt(seatRes.rows[0].count, 10) + 1;

  // Update ticket to checked_in with seat number
  await db.query(
    `UPDATE tickets SET status = 'checked_in', seat_number = $1 WHERE id = $2`,
    [nextSeat, ticket.id]
  );

  return {
    success: true,
    message: 'Check-in successful',
    passengerName: passengerName.trim(),
    flightNumber,
    date,
    seatNumber: nextSeat,
  };
}

module.exports = { buyTicket, checkIn };
