require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const swaggerUi  = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const authRoutes   = require('./routes/auth.routes');
const flightRoutes = require('./routes/flight.routes');
const ticketRoutes = require('./routes/ticket.routes');
const { seedFlights } = require('./seed');

const app  = express();
const PORT = process.env.PORT || 3000;

// Trust one proxy hop (App Runner / ALB). Required for correct req.ip and rate limiting.
app.set('trust proxy', 1);

// ── Request / Response logging ────────────────────────────────────────────────
app.use((req, res, next) => {
  const startTime = Date.now();
  const reqSize   = req.headers['content-length'] || 0;

  const originalWrite = res.write.bind(res);
  const originalEnd   = res.end.bind(res);
  let responseSize = 0;

  res.write = function (chunk, ...args) {
    if (chunk) responseSize += Buffer.byteLength(chunk);
    return originalWrite(chunk, ...args);
  };

  res.end = function (chunk, ...args) {
    if (chunk) responseSize += Buffer.byteLength(chunk);
    const authHeader = req.headers['authorization'];

    console.log(JSON.stringify({
      type:         'REQUEST_LOG',
      timestamp:    new Date().toISOString(),
      method:       req.method,
      path:         req.originalUrl,
      sourceIP:     req.ip || req.connection.remoteAddress,
      userAgent:    req.headers['user-agent'],
      contentType:  req.headers['content-type'],
      authStatus:   authHeader ? 'AUTH_PROVIDED' : 'NO_AUTH',
      requestSize:  parseInt(reqSize, 10),
      statusCode:   res.statusCode,
      latencyMs:    Date.now() - startTime,
      responseSize,
    }));

    return originalEnd(chunk, ...args);
  };

  next();
});

// ── Global rate limiter (100 req / IP / min) ──────────────────────────────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
}));

// ── Body parsing & CORS ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (_req, res) => res.json(swaggerSpec));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'airline-api' }));

// ── API v1 Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth',    authRoutes);
app.use('/api/v1/flights', flightRoutes);
app.use('/api/v1/tickets', ticketRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`Airline API running on http://localhost:${PORT}`);
  console.log(`Swagger UI:  http://localhost:${PORT}/api-docs`);
  await seedFlights();
});

module.exports = app;
