# Database Selection Analysis for Airport Flight Data Collector

## Project Overview
This project collects airport departure/arrival data for big data analysis, specifically focused on identifying patterns in flight cancellations and delays. The data consists of JSON files containing flight information from various airports (YYZ, SFO, etc.).

## Data Structure Analysis

### YYZ Data Format
- **File naming**: `yyz_departures_YYYY-MM-DD.json` or `yyz_arrivals_YYYY-MM-DD.json`
- **Key fields**:
  - Flight identification: `id`, `id2`, `alCode`, `flight number`
  - Timing: `schTime`, `latestTm`, `status`
  - Location: `gate`, `term`, `routes`
  - Status: `status` (DEP, ARR, CAN, etc.)
  - Additional: codeshare info, service type, aircraft info

### SFO Data Format
- **File naming**: `sfo_flights_YYYY-MM-DD.json`
- **Key fields**:
  - More detailed structure with nested objects
  - Timing: `scheduled_aod_time`, `estimated_aod_time`, `actual_aod_time`
  - Aircraft: `aircraft_mvmt_id`, `aircraft_transport_id`
  - Additional: baggage carousel, gate info, route type

## Database Requirements
1. **Storage**: Support for semi-structured JSON data
2. **Query Performance**: Ability to perform time-series analysis
3. **Scalability**: Handle daily data collection (365+ files per year per airport)
4. **Cost**: Free tier must support project needs
5. **API Access**: Direct data ingestion from collection scripts

## Oracle Cloud Infrastructure (OCI) Free Tier Options

### 1. Autonomous JSON Database
**Pros:**
- 20GB storage (2 OCPUs)
- Native JSON support with SQL/JSON
- Always Free tier available
- Built-in REST APIs
- Automatic indexing and optimization
- ACID compliance
- MongoDB-compatible API

**Cons:**
- Limited to 20GB in free tier
- Requires Oracle account and credit card
- Learning curve for Oracle-specific features
- Regional availability constraints

### 2. NoSQL Database Cloud Service
**Pros:**
- 25GB storage per table (3 tables max in free tier)
- High performance for key-value operations
- Automatic scaling
- SQL-like query language

**Cons:**
- Less flexible for complex queries
- Limited to 3 tables in free tier
- Not ideal for time-series analysis

## Cloudflare Free Tier Options

### 1. Cloudflare D1 (SQLite)
**Pros:**
- 5GB storage in free tier
- Edge deployment (low latency)
- SQL support with SQLite compatibility
- REST API available
- No cold starts
- Integrated with Workers (serverless functions)

**Cons:**
- 5GB limit may be restrictive long-term
- SQLite limitations for concurrent writes
- Beta product (potential changes)
- Requires data modeling for JSON

### 2. Cloudflare Workers KV
**Pros:**
- 1GB storage free tier
- Global edge network
- Fast key-value lookups
- Simple API

**Cons:**
- Very limited storage (1GB)
- No complex queries
- Not suitable for analytical workloads
- Key-value only (no SQL)

## Recommendation

**Primary Choice: Oracle Autonomous JSON Database**

**Reasoning:**
1. **Native JSON Support**: Perfect fit for the existing data structure without complex transformations
2. **Storage Capacity**: 20GB provides ~5-10 years of data storage based on current collection rates
3. **Query Capabilities**: SQL/JSON allows complex analytical queries for pattern detection
4. **REST APIs**: Easy integration with existing Node.js collection scripts
5. **Future-proof**: Can upgrade to paid tier if needed

**Secondary Choice: Cloudflare D1**

Best for projects prioritizing:
- Edge performance
- Serverless architecture
- Lower initial complexity

## Implementation Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Data Sources    │────▶│ Collection       │────▶│ Database        │
│ (YYZ/SFO APIs) │     │ Interface        │     │ (OCI/Cloudflare)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ GitHub Actions   │
                        │ (Scheduled)      │
                        └──────────────────┘
```

## Migration Strategy
1. Design unified schema for both YYZ and SFO data
2. Create database tables/collections
3. Build data ingestion interface
4. Migrate historical data
5. Update collection scripts to write directly to database
6. Maintain JSON file backup for redundancy

## Next Steps
1. Create implementation tickets for both OCI and Cloudflare solutions
2. Develop data collection interface specification
3. Design database schema optimized for time-series analysis
4. Plan phased migration of existing data