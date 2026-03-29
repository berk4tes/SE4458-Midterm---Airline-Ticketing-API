const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Airline API',
      version: '1.0.0',
      description: 'SE4458 Midterm – Group 1: API Project for Airline Company\n\n' +
        '**Architecture:** Routes → Controllers → Services → DB\n\n' +
        'Requests flow through Express routes into controllers (validation & error handling), ' +
        'then into services (business logic & DB queries), and finally hit the PostgreSQL database. ' +
        'All data in/out passes through DTO classes.\n\n' +
        '**Users for testing:**\n' +
        '- Admin (add flights, view passengers): `admin` / `adminpass`\n' +
        '- Regular user (buy tickets): `airline` / `userpass`\n\n' +
        '**How to authenticate:** Call `/api/v1/auth/login`, copy the token, ' +
        'then click Authorize and enter `Bearer <token>`.\n\n' +
        '**Note:** 10 seed flights are auto-loaded on startup — no need to add flights manually.',
    },
    servers: [
      { url: process.env.BASE_URL || 'http://localhost:3000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        AddFlightRequest: {
          type: 'object',
          description: 'Payload to add a single flight to the schedule.',
          required: ['flightNumber', 'dateFrom', 'dateTo', 'airportFrom', 'airportTo', 'duration', 'capacity'],
          properties: {
            flightNumber: { type: 'string', example: 'TK101', description: 'Unique IATA-style flight number' },
            dateFrom:     { type: 'string', format: 'date', example: '2026-04-10', description: 'Departure date (YYYY-MM-DD)' },
            dateTo:       { type: 'string', format: 'date', example: '2026-04-10', description: 'Arrival date – may equal dateFrom for same-day flights' },
            airportFrom:  { type: 'string', example: 'IST', description: 'Departure airport IATA code (e.g. IST, LHR, JFK)' },
            airportTo:    { type: 'string', example: 'LHR', description: 'Arrival airport IATA code' },
            duration:     { type: 'integer', example: 225, description: 'Flight duration in minutes' },
            capacity:     { type: 'integer', example: 180, description: 'Total seat count. Also sets initial availableSeats.' },
          },
        },
        BuyTicketRequest: {
          type: 'object',
          description: 'Payload to purchase one or more tickets on a flight.',
          required: ['flightNumber', 'date', 'passengerNames'],
          properties: {
            flightNumber:   { type: 'string', example: 'TK101', description: 'Flight number to book' },
            date:           { type: 'string', format: 'date', example: '2026-04-10', description: 'Travel date (YYYY-MM-DD)' },
            passengerNames: {
              oneOf: [
                { type: 'string', example: 'John Doe' },
                {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['John Doe', 'Jane Doe'],
                },
              ],
              description: 'Single passenger name (string) or list of names (array). Tickets are created for each name.',
            },
          },
        },
        CheckInRequest: {
          type: 'object',
          description: 'Payload to check in a passenger and receive a seat assignment.',
          required: ['flightNumber', 'date', 'passengerName'],
          properties: {
            flightNumber:  { type: 'string', example: 'TK101', description: 'Flight number of the booking' },
            date:          { type: 'string', format: 'date', example: '2026-04-10', description: 'Travel date of the booking (YYYY-MM-DD)' },
            passengerName: { type: 'string', example: 'John Doe', description: 'Full passenger name exactly as it appears on the ticket' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

module.exports = swaggerJsdoc(options);
