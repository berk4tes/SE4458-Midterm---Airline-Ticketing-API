/**
 * DTO for buying one or more tickets
 */
class BuyTicketDto {
  constructor({ flightNumber, date, passengerNames }) {
    this.flightNumber   = flightNumber;
    this.date           = date;
    // passengerNames can be a single string or an array
    this.passengerNames = Array.isArray(passengerNames)
      ? passengerNames
      : [passengerNames];
  }

  validate() {
    const errors = [];
    if (!this.flightNumber) errors.push('flightNumber is required');
    if (!this.date)         errors.push('date is required');
    if (!this.passengerNames || this.passengerNames.length === 0) {
      errors.push('passengerNames must contain at least one name');
    }
    return errors;
  }
}

/**
 * DTO for check-in
 */
class CheckInDto {
  constructor({ flightNumber, date, passengerName }) {
    this.flightNumber  = flightNumber;
    this.date          = date;
    this.passengerName = passengerName;
  }

  validate() {
    const errors = [];
    if (!this.flightNumber)  errors.push('flightNumber is required');
    if (!this.date)          errors.push('date is required');
    if (!this.passengerName) errors.push('passengerName is required');
    return errors;
  }
}

/**
 * DTO for passenger list response
 */
class PassengerDto {
  constructor(row) {
    this.ticketNumber  = row.ticket_number;
    this.passengerName = row.passenger_name;
    this.status        = row.status;
    this.seatNumber    = row.seat_number;
  }
}

module.exports = { BuyTicketDto, CheckInDto, PassengerDto };
