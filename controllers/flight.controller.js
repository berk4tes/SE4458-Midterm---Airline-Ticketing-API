const { parse } = require('csv-parse/sync');
const { AddFlightDto, QueryFlightDto } = require('../dtos/flight.dto');
const flightService = require('../services/flight.service');

/**
 * POST /api/v1/flights
 * Add a single flight (requires auth)
 */
async function addFlight(req, res) {
  try {
    const dto = new AddFlightDto(req.body);
    const errors = dto.validate();
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const result = await flightService.addFlight(dto);
    return res.status(201).json(result);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: `Flight number already exists` });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/flights/upload
 * Add flights from a CSV file (requires auth)
 */
async function addFlightByFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded. Use field name "file".' });
    }

    const csvContent = req.file.buffer.toString('utf-8');

    let records;
    try {
      records = parse(csvContent, {
        columns: true,        // First row is header
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      return res.status(400).json({ success: false, message: `CSV parse error: ${parseErr.message}` });
    }

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty or has no data rows' });
    }

    // Map CSV columns to AddFlightDto
    // Expected CSV headers: flight_number, date_from, date_to, airport_from, airport_to, duration, capacity
    const dtos = records.map(row => new AddFlightDto({
      flightNumber: row.flight_number || row.flightNumber,
      dateFrom:     row.date_from    || row.dateFrom,
      dateTo:       row.date_to      || row.dateTo,
      airportFrom:  row.airport_from || row.airportFrom,
      airportTo:    row.airport_to   || row.airportTo,
      duration:     row.duration,
      capacity:     row.capacity,
    }));

    const result = await flightService.addFlightsBatch(dtos);
    return res.status(207).json({ success: true, fileProcessingStatus: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/flights
 * Query available flights (no auth, paging, 3/day rate limit)
 */
async function queryFlights(req, res) {
  try {
    const dto = new QueryFlightDto(req.query);
    const errors = dto.validate();
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const identifier = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const result = await flightService.queryFlights(dto, identifier);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/flights/:flightNumber/passengers
 * Get passenger list for a flight (requires auth, paging)
 */
async function getPassengerList(req, res) {
  try {
    const { flightNumber } = req.params;
    const { date, page = 1, limit = 10 } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'date query parameter is required' });
    }

    const result = await flightService.getPassengerList(
      flightNumber,
      date,
      parseInt(page, 10),
      parseInt(limit, 10)
    );
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = { addFlight, addFlightByFile, queryFlights, getPassengerList };
