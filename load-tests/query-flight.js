/**
 * k6 Load Test – Query Flight endpoint
 * Tests: Normal Load (20 VUs), Peak Load (50 VUs), Stress Load (100 VUs)
 *
 * Run:  k6 run load-tests/query-flight.js
 *
 * NOTE: The Query Flight endpoint has a 3-calls/day rate limit per IP.
 * For load testing purposes this test hits the direct API (port 3000),
 * not the gateway, and you may want to temporarily raise or disable the
 * DB-level limit.  Set BASE_URL env var to override.
 *
 * Example:
 *   k6 run --env BASE_URL=http://localhost:3000 load-tests/query-flight.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

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
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2 seconds
    http_req_failed:   ['rate<0.1'],    // Less than 10% error rate
  },
};

const responseTime = new Trend('query_flight_response_time');
const errorRate    = new Rate('query_flight_errors');

export default function () {
  const params = new URLSearchParams({
    dateFrom:       '2025-06-01',
    dateTo:         '2025-12-31',
    airportFrom:    'IST',
    airportTo:      'LHR',
    numberOfPeople: '1',
    oneWay:         'true',
    page:           '1',
    limit:          '10',
  });

  const res = http.get(`${BASE_URL}/api/v1/flights?${params}`);

  const success = check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'has response body':    (r) => r.body && r.body.length > 0,
  });

  responseTime.add(res.timings.duration);
  errorRate.add(!success || (res.status !== 200 && res.status !== 429));

  sleep(1);
}
