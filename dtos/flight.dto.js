/**
 * DTO for adding a single flight
 */
class AddFlightDto {
  constructor({ flightNumber, dateFrom, dateTo, airportFrom, airportTo, duration, capacity }) {
    this.flightNumber = flightNumber;
    this.dateFrom     = dateFrom;
    this.dateTo       = dateTo;
    this.airportFrom  = airportFrom;
    this.airportTo    = airportTo;
    this.duration     = parseInt(duration, 10);
    this.capacity     = parseInt(capacity, 10);
  }

  validate() {
    const errors = [];
    if (!this.flightNumber)      errors.push('flightNumber is required');
    if (!this.dateFrom)          errors.push('dateFrom is required');
    if (!this.dateTo)            errors.push('dateTo is required');
    if (!this.airportFrom)       errors.push('airportFrom is required');
    if (!this.airportTo)         errors.push('airportTo is required');
    if (isNaN(this.duration) || this.duration <= 0)   errors.push('duration must be a positive integer (minutes)');
    if (isNaN(this.capacity)  || this.capacity  <= 0) errors.push('capacity must be a positive integer');
    return errors;
  }
}

/**
 * DTO for querying available flights
 */
class QueryFlightDto {
  constructor({ dateFrom, dateTo, airportFrom, airportTo, numberOfPeople, oneWay, page, limit }) {
    this.dateFrom      = dateFrom;
    this.dateTo        = dateTo;
    this.airportFrom   = airportFrom;
    this.airportTo     = airportTo;
    this.numberOfPeople = parseInt(numberOfPeople, 10) || 1;
    // oneWay: 'true' => one way, 'false' => round trip
    this.oneWay        = oneWay === undefined ? true : String(oneWay).toLowerCase() !== 'false';
    this.page          = parseInt(page, 10)  || 1;
    this.limit         = parseInt(limit, 10) || 10;
  }

  validate() {
    const errors = [];
    if (!this.dateFrom)     errors.push('dateFrom is required');
    if (!this.dateTo)       errors.push('dateTo is required');
    if (!this.airportFrom)  errors.push('airportFrom is required');
    if (!this.airportTo)    errors.push('airportTo is required');
    if (this.numberOfPeople <= 0) errors.push('numberOfPeople must be a positive integer');
    return errors;
  }
}

/**
 * Normalizes a value coming from pg DATE column to a plain 'YYYY-MM-DD' string.
 * pg-types can return DATE columns as either a plain string or a JS Date object
 * depending on version/configuration. This ensures a consistent format.
 */
function toDateString(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

/**
 * DTO for flight result returned to client
 */
class FlightResultDto {
  constructor(row) {
    this.flightNumber   = row.flight_number;
    this.duration       = row.duration;
    this.dateFrom       = toDateString(row.date_from);
    this.dateTo         = toDateString(row.date_to);
    this.airportFrom    = row.airport_from;
    this.airportTo      = row.airport_to;
    this.availableSeats = row.available_seats;
  }
}

module.exports = { AddFlightDto, QueryFlightDto, FlightResultDto };
