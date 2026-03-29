const db = require('../db');
const { FlightResultDto } = require('../dtos/flight.dto');

const QUERY_DAILY_LIMIT = 3;

/**
 * Add a single flight to the schedule.
 */
async function addFlight(dto) {
  const { flightNumber, dateFrom, dateTo, airportFrom, airportTo, duration, capacity } = dto;

  await db.query(
    `INSERT INTO flights
       (flight_number, date_from, date_to, airport_from, airport_to, duration, capacity, available_seats)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
    [flightNumber, dateFrom, dateTo, airportFrom.toUpperCase(), airportTo.toUpperCase(), duration, capacity]
  );

  return { success: true, message: `Flight ${flightNumber} added successfully` };
}

/**
 * Add multiple flights from a parsed array of flight objects.
 * Returns summary of successes and failures.
 */
async function addFlightsBatch(flightDtos) {
  const results = { total: flightDtos.length, success: 0, failed: 0, errors: [] };

  for (const dto of flightDtos) {
    const validationErrors = dto.validate();
    if (validationErrors.length > 0) {
      results.failed++;
      results.errors.push({ flightNumber: dto.flightNumber || 'unknown', reason: validationErrors.join(', ') });
      continue;
    }
    try {
      await addFlight(dto);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ flightNumber: dto.flightNumber, reason: err.message });
    }
  }

  return results;
}

/**
 * Check and increment the daily call count for Query Flight (limit 3/day per IP).
 * Returns false if limit exceeded, true if allowed.
 */
async function checkQueryRateLimit(identifier) {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const existing = await db.query(
    `SELECT call_count FROM query_rate_limits WHERE identifier = $1 AND query_date = $2`,
    [identifier, today]
  );

  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO query_rate_limits (identifier, query_date, call_count) VALUES ($1, $2, 1)`,
      [identifier, today]
    );
    return true;
  }

  const count = existing.rows[0].call_count;
  if (count >= QUERY_DAILY_LIMIT) {
    return false;
  }

  await db.query(
    `UPDATE query_rate_limits SET call_count = call_count + 1 WHERE identifier = $1 AND query_date = $2`,
    [identifier, today]
  );
  return true;
}

/**
 * Query available flights.
 * Supports one-way and round-trip.
 * Excludes flights with no available seats.
 * Enforces 3 calls/day limit per IP.
 */
async function queryFlights(dto, identifier) {
  // Enforce daily rate limit
  const allowed = await checkQueryRateLimit(identifier);
  if (!allowed) {
    console.log(`[queryFlights] Rate limit hit for identifier: ${identifier}`);
    const error = new Error('Daily query limit of 3 reached. Please try again tomorrow.');
    error.status     = 429; // express convention
    error.statusCode = 429; // custom convention used in controller
    throw error;
  }

  const { dateFrom, dateTo, airportFrom, airportTo, numberOfPeople, oneWay, page, limit } = dto;
  const offset = (page - 1) * limit;

  // Base query: flights with enough seats in the requested direction within date range.
  // ::date casts ensure consistent DATE comparison regardless of how pg transmits the parameter type.
  const baseQuery = `
    SELECT flight_number, duration, date_from, date_to, airport_from, airport_to, available_seats
    FROM flights
    WHERE airport_from = $1
      AND airport_to   = $2
      AND date_from   >= $3::date
      AND date_from   <= $4::date
      AND available_seats >= $5
  `;

  const queryParams = [airportFrom.toUpperCase(), airportTo.toUpperCase(), dateFrom, dateTo, numberOfPeople, limit, offset];
  console.log('[DEBUG queryFlights] params:', JSON.stringify(queryParams));
  console.log('[DEBUG queryFlights] SQL:', (baseQuery + ' ORDER BY date_from LIMIT $6 OFFSET $7').replace(/\s+/g, ' ').trim());

  const outboundResult = await db.query(
    baseQuery + ` ORDER BY date_from LIMIT $6 OFFSET $7`,
    [airportFrom.toUpperCase(), airportTo.toUpperCase(), dateFrom, dateTo, numberOfPeople, limit, offset]
  );

  const outboundFlights = outboundResult.rows.map(r => ({
    ...new FlightResultDto(r),
    leg: 'outbound',
  }));

  if (oneWay) {
    const countRes = await db.query(
      `SELECT COUNT(*) FROM flights WHERE airport_from=$1 AND airport_to=$2 AND date_from>=$3::date AND date_from<=$4::date AND available_seats>=$5`,
      [airportFrom.toUpperCase(), airportTo.toUpperCase(), dateFrom, dateTo, numberOfPeople]
    );
    return {
      tripType: 'one-way',
      page,
      limit,
      total: parseInt(countRes.rows[0].count, 10),
      flights: outboundFlights,
    };
  }

  // Round trip: also query return direction
  const returnResult = await db.query(
    baseQuery + ` ORDER BY date_from LIMIT $6 OFFSET $7`,
    [airportTo.toUpperCase(), airportFrom.toUpperCase(), dateFrom, dateTo, numberOfPeople, limit, offset]
  );

  const returnFlights = returnResult.rows.map(r => ({
    ...new FlightResultDto(r),
    leg: 'return',
  }));

  return {
    tripType: 'round-trip',
    page,
    limit,
    outbound: outboundFlights,
    return: returnFlights,
  };
}

/**
 * Get paginated passenger list for a flight on a given date.
 */
async function getPassengerList(flightNumber, date, page, limit) {
  const offset = (page - 1) * limit;

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

  const result = await db.query(
    `SELECT ticket_number, passenger_name, status, seat_number
     FROM tickets
     WHERE flight_id = $1 AND flight_date = $2
     ORDER BY id
     LIMIT $3 OFFSET $4`,
    [flightId, date, limit, offset]
  );

  const countRes = await db.query(
    `SELECT COUNT(*) FROM tickets WHERE flight_id = $1 AND flight_date = $2`,
    [flightId, date]
  );

  return {
    flightNumber,
    date,
    page,
    limit,
    total: parseInt(countRes.rows[0].count, 10),
    passengers: result.rows.map(r => ({
      ticketNumber:  r.ticket_number,
      passengerName: r.passenger_name,
      status:        r.status,
      seatNumber:    r.seat_number,
    })),
  };
}

module.exports = { addFlight, addFlightsBatch, queryFlights, getPassengerList };
