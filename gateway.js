require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app          = express();
const GATEWAY_PORT = process.env.GATEWAY_PORT || 4000;
const API_TARGET   = `http://localhost:${process.env.PORT || 3000}`;

// ── Request/Response logging middleware ───────────────────────────────────────
app.use((req, res, next) => {
  const startTime = Date.now();
  const reqSize   = req.headers['content-length'] || 0;

  // Intercept response to capture status/size
  const originalWrite = res.write.bind(res);
  const originalEnd   = res.end.bind(res);
  let responseSize = 0;

  res.write = function (chunk, ...args) {
    if (chunk) responseSize += Buffer.byteLength(chunk);
    return originalWrite(chunk, ...args);
  };

  res.end = function (chunk, ...args) {
    if (chunk) responseSize += Buffer.byteLength(chunk);
    const latency   = Date.now() - startTime;
    const authHeader = req.headers['authorization'];
    const authStatus = authHeader ? 'AUTH_PROVIDED' : 'NO_AUTH';

    const log = {
      type:       'GATEWAY_LOG',
      timestamp:  new Date().toISOString(),
      method:     req.method,
      path:       req.originalUrl,
      sourceIP:   req.ip || req.connection.remoteAddress,
      headers:    {
        'user-agent':    req.headers['user-agent'],
        'content-type':  req.headers['content-type'],
        authorization:   authHeader ? authStatus : undefined,
      },
      requestSize:  parseInt(reqSize, 10),
      authStatus,
      statusCode:   res.statusCode,
      latencyMs:    latency,
      responseSize,
    };

    console.log(JSON.stringify(log));
    return originalEnd(chunk, ...args);
  };

  next();
});

// ── Global rate limiter (gateway level) ───────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,              // 100 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

app.use(globalLimiter);

// ── Proxy all requests to the backend API ────────────────────────────────────
app.use(
  '/',
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({ success: false, message: 'API is unreachable' });
      },
    },
  })
);

app.listen(GATEWAY_PORT, () => {
  console.log(`API Gateway running on http://localhost:${GATEWAY_PORT}`);
  console.log(`Proxying to backend: ${API_TARGET}`);
  console.log(`Swagger UI: http://localhost:${GATEWAY_PORT}/api-docs`);
});
