# Airline API — SE4458 Midterm Group 1

REST API for an airline ticketing system built with **Node.js + Express + PostgreSQL**.

> **[Live Swagger UI](https://berk-airline-api-dyg6fycfh5fwdqat.switzerlandnorth-01.azurewebsites.net/api-docs)**  |  **[Demo Video](https://drive.google.com/file/d/1Z4SiHDEk00jC5cdtC_JjXjI5Iean5qGA/view?usp=sharing)**

---

## Design & Assumptions

### Architecture
```
Client → API Gateway (port 4000) → Airline API (port 3000) → PostgreSQL (Neon)
```

- **Service-Oriented**: Routes → Controllers → Services → DB. No database calls in controllers.
- **DTOs**: All request/response data flows through DTO classes for validation and mapping.
- **API Versioning**: All endpoints prefixed with `/api/v1/`.
- **Authentication**: JWT Bearer tokens (8-hour expiry). Call `/api/v1/auth/login` to get a token.
- **Gateway**: `gateway.js` handles rate limiting (100 req/min global) and structured request/response logging.

### Assumptions
1. `dateFrom` and `dateTo` on a flight record represent the **departure** and **arrival** dates of the flight (may be same day for short routes).
2. **Query Flight** "3 per day" limit is enforced per IP address using a database table (`query_rate_limits`), not gateway-level rate limiting.
3. For **round-trip** queries, the API returns both outbound (A→B) and return (B→A) flights separately.
4. **Seat assignment** is simple sequential numbering (1, 2, 3...) based on the order passengers check in.
5. Multiple passengers can be booked in a single **Buy Ticket** call; `passengerNames` accepts a string or array.
6. **Authentication** is required for: Add Flight, Add Flight by File, Buy Ticket, Query Passenger List.
7. Authentication is **not** required for: Query Flight, Check In.
8. Passwords are stored as plain text for this demo. Use bcrypt in production.

---

## Architecture Diagrams

### Request Flow — Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway<br/>(port 4000)
    participant A as Auth Middleware
    participant Ctrl as Controller
    participant Svc as Service
    participant DB as PostgreSQL

    C->>G: HTTP Request
    G->>G: Rate limit check (100 req/min)
    G->>A: Forward to API (port 3000)
    A->>A: Verify JWT (if protected route)
    A->>Ctrl: Attach user context
    Ctrl->>Ctrl: Validate & parse DTO
    Ctrl->>Svc: Call service method
    Svc->>DB: SQL query / insert
    DB-->>Svc: Result rows
    Svc-->>Ctrl: Business result
    Ctrl-->>G: JSON response
    G-->>C: HTTP Response
```

### User Flow Diagram

```mermaid
flowchart TD
    A([Start]) --> B[POST /auth/login\nadmin or airline user]
    B --> C{Login OK?}
    C -- No --> B
    C -- Yes --> D[Copy JWT token\nclick Authorize in Swagger]

    D --> E[POST /flights\nAdd flight e.g. IST→LHR]
    E --> F{201 Created?}
    F -- 409 conflict --> E
    F -- Yes --> G[GET /flights\nauthenticated query with date + airports]

    G --> H{200 Results?}
    H -- 429 rate limit --> I[Wait until tomorrow\nor use different IP]
    H -- Yes --> J[POST /tickets/buy\npassengerNames + flightNumber + date]

    J --> K{Seats available?}
    K -- No seats --> L([Sold Out])
    K -- Yes 201 --> M[Save ticket number\nreturned in response]

    M --> N[POST /tickets/checkin\npassengerName + flightNumber + date]
    N --> O{Check-in OK?}
    O -- Already checked in --> O2([Done — seat already assigned])
    O -- Yes --> P[Receive seat number]

    P --> Q[GET /flights/:id/passengers\nView full passenger list]
    Q --> R([Done])
```

---

## Data Model (ER Diagram)

```
┌─────────────────────┐       ┌──────────────────────────┐
│       users         │       │        flights           │
├─────────────────────┤       ├──────────────────────────┤
│ id          SERIAL  │       │ id            SERIAL     │
│ username    VARCHAR │       │ flight_number VARCHAR(20)│
│ password    VARCHAR │       │ date_from     DATE       │
│ role        VARCHAR │       │ date_to       DATE       │
└─────────────────────┘       │ airport_from  VARCHAR(10)│
                              │ airport_to    VARCHAR(10)│
                              │ duration      INTEGER    │
                              │ capacity      INTEGER    │
                              │ available_seats INTEGER  │
                              │ created_at    TIMESTAMP  │
                              └──────────┬───────────────┘
                                         │ 1
                                         │
                                         │ N
                              ┌──────────┴───────────────┐
                              │        tickets           │
                              ├──────────────────────────┤
                              │ id            SERIAL     │
                              │ ticket_number VARCHAR(50)│
                              │ flight_id     INTEGER FK │
                              │ passenger_name VARCHAR   │
                              │ flight_date   DATE       │
                              │ status        VARCHAR(20)│
                              │ seat_number   INTEGER    │
                              │ created_at    TIMESTAMP  │
                              └──────────────────────────┘

┌──────────────────────────────┐
│      query_rate_limits       │
├──────────────────────────────┤
│ id          SERIAL           │
│ identifier  VARCHAR (IP)     │
│ query_date  DATE             │
│ call_count  INTEGER          │
└──────────────────────────────┘
```

---

## Setup

### 1. Database
Create a free PostgreSQL database on [Neon](https://neon.tech) (or any PostgreSQL provider).
Run `schema.sql` in your database console.

### 2. Environment
```bash
cp .env .env.local
# Edit .env and set your DATABASE_URL and JWT_SECRET
```

### 3. Install & Run
```bash
cd airline-api
npm install

# Terminal 1 — Start API
npm start          # or: npm run dev

# Terminal 2 — Start Gateway
npm run gateway
```

### 4. Open Swagger
- Via Gateway: http://localhost:4000/api-docs
- Direct API:  http://localhost:3000/api-docs

---

## API Endpoints

| Method | Endpoint                                | Auth  | Paging | Description                        |
|--------|-----------------------------------------|-------|--------|------------------------------------|
| POST   | `/api/v1/auth/login`                    | No    | No     | Get JWT token                      |
| POST   | `/api/v1/flights`                       | YES   | No     | Add a flight                       |
| POST   | `/api/v1/flights/upload`                | YES   | No     | Add flights from CSV file          |
| GET    | `/api/v1/flights`                       | No    | YES    | Query available flights (3/day)    |
| POST   | `/api/v1/tickets/buy`                   | YES   | No     | Buy ticket(s)                      |
| POST   | `/api/v1/tickets/checkin`               | No    | No     | Check in a passenger               |
| GET    | `/api/v1/flights/:flightNumber/passengers` | YES | YES  | Query passenger list               |

### Test Credentials
| Username | Password   | Role  | Can do                         |
|----------|------------|-------|--------------------------------|
| admin    | adminpass  | admin | Add flights, view passengers   |
| airline  | userpass   | user  | Buy tickets                    |

---

## CSV File Format (Add Flight by File)

Upload a `.csv` file with this header row:

```csv
flight_number,date_from,date_to,airport_from,airport_to,duration,capacity
TK101,2025-06-15,2025-06-15,IST,LHR,225,180
TK102,2025-06-15,2025-06-15,LHR,IST,225,180
```

See `sample-flights.csv` for a full example.

---

## Load Testing (k6)

### Install k6
```bash
# Windows
winget install k6 --source winget

# Or download from https://k6.io/docs/get-started/installation/
```

### Run Tests
```bash
# Query Flight load test (no token needed)
k6 run load-tests/query-flight.js --env BASE_URL=https://berk-airline-api-dyg6fycfh5fwdqat.switzerlandnorth-01.azurewebsites.net

# Buy Ticket load test (token required — get token from POST /auth/login first)
k6 run load-tests/buy-ticket.js --env BASE_URL=https://berk-airline-api-dyg6fycfh5fwdqat.switzerlandnorth-01.azurewebsites.net --env JWT_TOKEN=<your_token>
```

### Test Scenarios

| Scenario    | VUs | Duration |
|-------------|-----|----------|
| Normal Load | 20  | 30s      |
| Peak Load   | 50  | 30s      |
| Stress Load | 100 | 30s      |

---

## Load Test Results

### Query Flight — GET /api/v1/flights

| Metric         | Value      |
|----------------|------------|
| Total Requests | 1,220      |
| Avg Response   | 3,350 ms   |
| Median         | 2,104 ms   |
| p95            | 16,283 ms  |
| Error Rate     | 0.00%      |
| Req/sec        | 11.9       |

![Query Flight k6 Results](load-tests/query-flight-result.png)

### Buy Ticket — POST /api/v1/tickets/buy

| Metric         | Value    |
|----------------|----------|
| Total Requests | 3,923    |
| Avg Response   | 322 ms   |
| Median         | 68 ms    |
| p95            | 1,459 ms |
| Error Rate     | 0.00%    |
| Req/sec        | 38.8     |

![Buy Ticket k6 Results](load-tests/buy-ticket-result.png)

### Analysis

Both endpoints achieved a **0% error rate** across all three scenarios (Normal 20 VUs, Peak 50 VUs, Stress 100 VUs), demonstrating strong reliability under load. The Buy Ticket endpoint performed exceptionally well with a median response time of 68ms and p95 of 1.45s. The Query Flight endpoint showed higher latency (p95: 16.28s) due to Azure App Service F1 Free tier resource limitations — this is expected behavior for a free-tier deployment and not indicative of application-level issues. The rate limit for Query Flight (3/day per IP) was temporarily disabled during load testing to produce meaningful results. Potential improvements include adding Redis caching for flight queries and using database transactions for concurrent ticket purchases.

---

## Deployment (Azure App Service)

- **Platform**: Azure App Service (F1 Free tier, Switzerland North)
- **Database**: Neon PostgreSQL (Frankfurt)
- **CI/CD**: GitHub Actions — auto-deploy on push to `main`
- **Swagger UI**: [Live API Docs](https://berk-airline-api-dyg6fycfh5fwdqat.switzerlandnorth-01.azurewebsites.net/api-docs)

### Environment Variables (Azure)
| Variable       | Description                    |
|----------------|--------------------------------|
| DATABASE_URL   | Neon PostgreSQL connection URL |
| JWT_SECRET     | Secret key for JWT signing     |
| DATABASE_SSL   | `true`                         |
| BASE_URL       | Azure App Service URL          |

---

## Issues Encountered

- **Rate limiting for Query Flight**: Implemented at DB level instead of gateway level because the requirement is "3 per day" (not per minute), which requires persistent storage across restarts.
- **Round-trip search**: The spec asks for one-way/round-trip but doesn't specify the response format difference. The API returns `outbound` and `return` arrays for round-trip.
- **Multiple passengers**: Buy Ticket accepts both a string and array for `passengerNames` for flexibility.