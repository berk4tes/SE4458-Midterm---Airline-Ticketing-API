-- Airline API Database Schema
-- Run this script once to create all required tables

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  username  VARCHAR(100) UNIQUE NOT NULL,
  password  VARCHAR(255) NOT NULL,
  role      VARCHAR(50)  NOT NULL  -- 'admin' or 'user'
);

-- Seed initial users (passwords stored as plain text for demo; use bcrypt in production)
INSERT INTO users (username, password, role) VALUES
  ('admin',   'adminpass', 'admin'),
  ('airline', 'userpass',  'user')
ON CONFLICT (username) DO NOTHING;

-- Flights table
CREATE TABLE IF NOT EXISTS flights (
  id              SERIAL PRIMARY KEY,
  flight_number   VARCHAR(20) UNIQUE NOT NULL,
  date_from       DATE        NOT NULL,
  date_to         DATE        NOT NULL,
  airport_from    VARCHAR(10) NOT NULL,
  airport_to      VARCHAR(10) NOT NULL,
  duration        INTEGER     NOT NULL,  -- duration in minutes
  capacity        INTEGER     NOT NULL,
  available_seats INTEGER     NOT NULL,
  created_at      TIMESTAMP   DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id              SERIAL PRIMARY KEY,
  ticket_number   VARCHAR(50)  UNIQUE NOT NULL,
  flight_id       INTEGER      REFERENCES flights(id),
  passenger_name  VARCHAR(255) NOT NULL,
  flight_date     DATE         NOT NULL,
  status          VARCHAR(20)  DEFAULT 'booked',  -- 'booked' or 'checked_in'
  seat_number     INTEGER,                         -- assigned at check-in
  created_at      TIMESTAMP    DEFAULT NOW()
);

-- Query rate limit tracking (3 calls per IP per day for Query Flight)
CREATE TABLE IF NOT EXISTS query_rate_limits (
  id           SERIAL  PRIMARY KEY,
  identifier   VARCHAR(255) NOT NULL,  -- IP address
  query_date   DATE         NOT NULL,
  call_count   INTEGER      DEFAULT 1,
  UNIQUE (identifier, query_date)
);
