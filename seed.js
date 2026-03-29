const db = require('./db');

const SEED_FLIGHTS = [
  { flightNumber: 'TK101', dateFrom: '2026-05-01', dateTo: '2026-05-01', airportFrom: 'IST', airportTo: 'LHR', duration: 225, capacity: 180 },
  { flightNumber: 'TK102', dateFrom: '2026-05-01', dateTo: '2026-05-01', airportFrom: 'LHR', airportTo: 'IST', duration: 225, capacity: 180 },
  { flightNumber: 'TK201', dateFrom: '2026-05-05', dateTo: '2026-05-05', airportFrom: 'IST', airportTo: 'JFK', duration: 600, capacity: 300 },
  { flightNumber: 'TK202', dateFrom: '2026-05-05', dateTo: '2026-05-06', airportFrom: 'JFK', airportTo: 'IST', duration: 600, capacity: 300 },
  { flightNumber: 'TK301', dateFrom: '2026-05-10', dateTo: '2026-05-10', airportFrom: 'IST', airportTo: 'CDG', duration: 210, capacity: 150 },
  { flightNumber: 'TK302', dateFrom: '2026-05-10', dateTo: '2026-05-10', airportFrom: 'CDG', airportTo: 'IST', duration: 210, capacity: 150 },
  { flightNumber: 'TK401', dateFrom: '2026-05-15', dateTo: '2026-05-15', airportFrom: 'ADB', airportTo: 'IST', duration:  65, capacity: 120 },
  { flightNumber: 'TK402', dateFrom: '2026-05-15', dateTo: '2026-05-15', airportFrom: 'IST', airportTo: 'ADB', duration:  65, capacity: 120 },
  { flightNumber: 'TK501', dateFrom: '2026-05-20', dateTo: '2026-05-20', airportFrom: 'IST', airportTo: 'FRA', duration: 195, capacity: 160 },
  { flightNumber: 'TK502', dateFrom: '2026-05-20', dateTo: '2026-05-20', airportFrom: 'FRA', airportTo: 'IST', duration: 195, capacity: 160 },
];

async function seedFlights() {
  let seeded = 0;
  for (const f of SEED_FLIGHTS) {
    const result = await db.query(
      `INSERT INTO flights
         (flight_number, date_from, date_to, airport_from, airport_to, duration, capacity, available_seats)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (flight_number) DO NOTHING`,
      [f.flightNumber, f.dateFrom, f.dateTo, f.airportFrom, f.airportTo, f.duration, f.capacity]
    );
    if (result.rowCount > 0) seeded++;
  }
  if (seeded > 0) {
    console.log(`[seed] Inserted ${seeded} seed flight(s).`);
  } else {
    console.log('[seed] All seed flights already exist – skipped.');
  }
}

module.exports = { seedFlights };
