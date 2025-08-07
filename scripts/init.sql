-- Initialize Airport Flight Data Database

-- Create schema
CREATE SCHEMA IF NOT EXISTS flight_data;

-- Set search path
SET search_path TO flight_data, public;

-- Create airports table
CREATE TABLE IF NOT EXISTS airports (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100),
    timezone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create flights table
CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(20) NOT NULL,
    airline VARCHAR(100),
    origin VARCHAR(3),
    destination VARCHAR(3),
    scheduled_departure TIMESTAMP,
    actual_departure TIMESTAMP,
    scheduled_arrival TIMESTAMP,
    actual_arrival TIMESTAMP,
    status VARCHAR(50),
    gate VARCHAR(10),
    terminal VARCHAR(10),
    aircraft_type VARCHAR(50),
    delay_minutes INTEGER DEFAULT 0,
    cancellation_reason TEXT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    airport_code VARCHAR(3),
    data_source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_origin FOREIGN KEY (origin) REFERENCES airports(code) ON DELETE SET NULL,
    CONSTRAINT fk_destination FOREIGN KEY (destination) REFERENCES airports(code) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_flights_flight_number ON flights(flight_number);
CREATE INDEX idx_flights_airline ON flights(airline);
CREATE INDEX idx_flights_origin ON flights(origin);
CREATE INDEX idx_flights_destination ON flights(destination);
CREATE INDEX idx_flights_scheduled_departure ON flights(scheduled_departure);
CREATE INDEX idx_flights_scheduled_arrival ON flights(scheduled_arrival);
CREATE INDEX idx_flights_status ON flights(status);
CREATE INDEX idx_flights_collected_at ON flights(collected_at);
CREATE INDEX idx_flights_airport_code ON flights(airport_code);

-- Create statistics table for aggregated data
CREATE TABLE IF NOT EXISTS flight_statistics (
    id SERIAL PRIMARY KEY,
    airport_code VARCHAR(3),
    date DATE,
    total_flights INTEGER DEFAULT 0,
    total_arrivals INTEGER DEFAULT 0,
    total_departures INTEGER DEFAULT 0,
    delayed_flights INTEGER DEFAULT 0,
    cancelled_flights INTEGER DEFAULT 0,
    average_delay_minutes DECIMAL(10,2),
    on_time_percentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(airport_code, date)
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS flight_predictions (
    id SERIAL PRIMARY KEY,
    flight_id INTEGER,
    flight_number VARCHAR(20),
    prediction_type VARCHAR(50),
    predicted_delay_minutes INTEGER,
    confidence_score DECIMAL(5,4),
    model_version VARCHAR(20),
    features_used JSONB,
    prediction_made_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actual_delay_minutes INTEGER,
    accuracy_score DECIMAL(5,4),
    CONSTRAINT fk_flight FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

-- Create patterns table
CREATE TABLE IF NOT EXISTS flight_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(50),
    airport_code VARCHAR(3),
    pattern_data JSONB,
    confidence DECIMAL(5,4),
    occurrences INTEGER DEFAULT 1,
    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create API usage table for monitoring
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    user_id VARCHAR(100),
    ip_address INET,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    url TEXT NOT NULL,
    events TEXT[],
    is_active BOOLEAN DEFAULT true,
    secret_key VARCHAR(255),
    last_triggered TIMESTAMP,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial airport data
INSERT INTO airports (code, name, city, country, timezone) VALUES
    ('SFO', 'San Francisco International Airport', 'San Francisco', 'USA', 'America/Los_Angeles'),
    ('YYZ', 'Toronto Pearson International Airport', 'Toronto', 'Canada', 'America/Toronto'),
    ('YVR', 'Vancouver International Airport', 'Vancouver', 'Canada', 'America/Vancouver'),
    ('LAX', 'Los Angeles International Airport', 'Los Angeles', 'USA', 'America/Los_Angeles'),
    ('ORD', 'Chicago O''Hare International Airport', 'Chicago', 'USA', 'America/Chicago'),
    ('ATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'USA', 'America/New_York')
ON CONFLICT (code) DO NOTHING;

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_airports_updated_at BEFORE UPDATE ON airports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON flights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_statistics_updated_at BEFORE UPDATE ON flight_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW v_recent_flights AS
SELECT 
    f.*,
    ao.name as origin_name,
    ad.name as destination_name
FROM flights f
LEFT JOIN airports ao ON f.origin = ao.code
LEFT JOIN airports ad ON f.destination = ad.code
WHERE f.collected_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY f.collected_at DESC;

CREATE OR REPLACE VIEW v_daily_statistics AS
SELECT 
    DATE(collected_at) as date,
    airport_code,
    COUNT(*) as total_flights,
    SUM(CASE WHEN delay_minutes > 15 THEN 1 ELSE 0 END) as delayed_flights,
    SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_flights,
    AVG(delay_minutes) as avg_delay,
    100.0 * SUM(CASE WHEN delay_minutes <= 15 THEN 1 ELSE 0 END) / COUNT(*) as on_time_percentage
FROM flights
GROUP BY DATE(collected_at), airport_code
ORDER BY date DESC, airport_code;

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON SCHEMA flight_data TO flightdata;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA flight_data TO flightdata;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA flight_data TO flightdata;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
END $$;