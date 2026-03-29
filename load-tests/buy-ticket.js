/**
 * k6 Load Test – Buy Ticket endpoint
 * Tests: Normal Load (20 VUs), Peak Load (50 VUs), Stress Load (100 VUs)
 *
 * Run:  k6 run load-tests/buy-ticket.js
 *
 * Prerequisites:
 *   1. Have a flight added (e.g., flight_number=TK101, date=2026-05-01, large capacity)
 *   2. Have a valid JWT token (get from /api/v1/auth/login)
 *
 * Example:
 *   k6 run --env BASE_URL=http://localhost:4000 --env JWT_TOKEN=<your_token> load-tests/buy-ticket.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:4000';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'replace-with-your-jwt-token';

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      startTime: '0s',
      tags: { scenario: 'normal' },
    },
    peak_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      startTime: '35s',
      tags: { scenario: 'peak' },
    },
    stress_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
      startTime: '70s',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests under 3 seconds
    http_req_failed:   ['rate<0.1'],    // Less than 10% error rate
  },
};

const responseTime = new Trend('buy_ticket_response_time');
const errorRate    = new Rate('buy_ticket_errors');

let passengerCounter = 0;

export default function () {
  passengerCounter++;
  const passengerName = `Passenger_${__VU}_${__ITER}`;

  const payload = JSON.stringify({
    flightNumber:   'TK101',
    date:           '2026-05-01',
    passengerNames: [passengerName],
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${JWT_TOKEN}`,
  };

  const res = http.post(`${BASE_URL}/api/v1/tickets/buy`, payload, { headers });

  const success = check(res, {
    'status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'has success field':    (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success !== undefined;
      } catch {
        return false;
      }
    },
  });

  responseTime.add(res.timings.duration);
  errorRate.add(!success || (res.status !== 201 && res.status !== 200));

  sleep(1);
}
