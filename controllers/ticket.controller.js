const { BuyTicketDto, CheckInDto } = require('../dtos/ticket.dto');
const ticketService = require('../services/ticket.service');

/**
 * POST /api/v1/tickets/buy
 * Buy ticket(s) for one or more passengers (requires auth)
 */
async function buyTicket(req, res) {
  try {
    const dto = new BuyTicketDto(req.body);
    const errors = dto.validate();
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const result = await ticketService.buyTicket(dto);

    if (!result.success) {
      return res.status(200).json(result); // sold out is not an HTTP error
    }
    return res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/tickets/checkin
 * Check in a passenger (no auth, assigns seat number)
 */
async function checkIn(req, res) {
  try {
    const dto = new CheckInDto(req.body);
    const errors = dto.validate();
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const result = await ticketService.checkIn(dto);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = { buyTicket, checkIn };
