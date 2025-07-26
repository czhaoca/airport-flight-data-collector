# Complete Database Setup Guide

This comprehensive guide covers everything you need to know about setting up databases for the Airport Flight Data Collector.

## Table of Contents
- [Quick Start](#quick-start)
- [Provider Comparison](#provider-comparison)
- [Detailed Setup Instructions](#detailed-setup-instructions)
  - [Local Storage](#local-storage-default)
  - [Cloudflare D1](#cloudflare-d1)
  - [Oracle Cloud](#oracle-cloud-infrastructure)
- [Configuration Reference](#configuration-reference)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Quick Start

### 🚀 Fastest Setup (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/czhaoca/airport-flight-data-collector.git
cd airport-flight-data-collector
npm install

# 2. Copy environment template
cp .env.template .env

# 3. Choose your path:
# Option A: Use local storage (no setup!)
echo "DB_PROVIDER=local" >> .env

# Option B: Set up Cloudflare D1 (10 min)
# Option C: Set up Oracle Cloud (20 min)

# 4. Test your setup
node scripts/test-database.js
```

### ✅ Quick Decision Guide

Choose **Local Storage** if:
- Just testing or developing
- Don't need SQL queries
- Want zero setup time

Choose **Cloudflare D1** if:
- Want quick cloud setup (10 min)
- Need edge deployment
- Have < 5GB data

Choose **Oracle Cloud** if:
- Need enterprise features
- Want 40GB free storage
- Need advanced SQL capabilities

## Provider Comparison

| Feature | Local Files | Cloudflare D1 | Oracle Cloud |
|---------|-------------|---------------|--------------|
| **Setup Time** | 0 minutes | 10 minutes | 20 minutes |
| **Free Tier** | Unlimited | 5GB | 2×20GB |
| **Query Speed** | N/A (files) | Fast | Fastest |
| **SQL Support** | ❌ | ✅ SQLite | ✅ Full SQL |
| **Global Access** | ❌ | ✅ Edge network | ✅ Cloud |
| **Backup** | Manual | Automatic | Automatic |
| **Best For** | Development | Small projects | Production |
| **Complexity** | None | Low | Medium |

### Storage Calculations

Average data sizes:
- **Per flight**: ~1-2 KB
- **Per day per airport**: ~200-500 KB
- **Per year per airport**: ~100-200 MB
- **3 airports, 5 years**: ~2-3 GB

## Detailed Setup Instructions

### Local Storage (Default)

No setup required! This is the default option.

#### Configuration
```bash
# .env
DB_PROVIDER=local
LOCAL_DATA_DIR=./data           # Where to store files
LOCAL_PRETTY_PRINT=true         # Format JSON nicely
```

#### File Structure
```
data/
├── SFO/
│   ├── sfo_flights_2025-07-24.json
│   └── sfo_flights_2025-07-25.json
├── YYZ/
│   ├── yyz_arrivals_2025-07-24.json
│   └── yyz_departures_2025-07-24.json
└── YVR/
    └── yvr_flights_2025-07-24.json
```

#### Pros & Cons
✅ **Pros:**
- Zero configuration
- Easy to inspect/edit data
- Git-friendly (can track changes)
- No internet required

❌ **Cons:**
- No SQL queries
- Large repo size over time
- No concurrent access
- Manual backups

---

### Cloudflare D1

Best for serverless deployments and edge computing.

#### Prerequisites
- Cloudflare account (free)
- Node.js 18+

#### Step-by-Step Setup

##### 1. Create Cloudflare Account
```bash
# Visit https://dash.cloudflare.com/sign-up
# Sign up with email
# Verify your email
```

##### 2. Get Account ID
1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Look at right sidebar for "Account ID"
3. Click copy button
4. Save as `CF_ACCOUNT_ID`

![Account ID Location](https://developers.cloudflare.com/assets/account-id.png)

##### 3. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
# Browser opens - click "Allow"
```

##### 4. Create Database
```bash
wrangler d1 create airport-flight-data

# Output:
# ✅ Successfully created DB 'airport-flight-data'
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Save the `database_id` as `CF_DATABASE_ID`

##### 5. Create API Token
1. Visit [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Choose "Custom token"
4. Configure:
   - **Name**: airport-flight-data
   - **Permissions**: 
     - Account → D1 → Edit
     - Account → Workers Scripts → Edit (optional)
   - **Account Resources**: Include → Your account
5. Create and copy token
6. Save as `CF_API_TOKEN`

##### 6. Configure Environment
```bash
# .env
DB_PROVIDER=cloudflare
CF_ACCOUNT_ID=your_account_id_here
CF_DATABASE_ID=your_database_id_here
CF_API_TOKEN=your_token_here

# Optional for better performance
CF_WORKER_URL=https://your-worker.workers.dev
```

#### Database Structure
Tables are created automatically:
- `{prefix}_{env}_flights` - Main flight data
- `{prefix}_{env}_flight_status_history` - Status changes

#### SQL Queries
```sql
-- Find delayed flights
SELECT * FROM flights 
WHERE actual_time > scheduled_time 
AND date = '2025-07-24';

-- Count cancellations by airline
SELECT airline_code, COUNT(*) as cancellations
FROM flights
WHERE status = 'CANCELLED'
GROUP BY airline_code;
```

#### Cost Considerations
- **Free**: 5GB storage, 5M reads/day, 100K writes/day
- **Paid**: $0.75/GB/month after free tier
- **Workers**: 100K requests/day free

---

### Oracle Cloud Infrastructure

Best for enterprise features and large datasets.

#### Prerequisites
- Credit card (verification only)
- Phone number

#### Step-by-Step Setup

##### 1. Create Oracle Account
1. Visit [Oracle Cloud Free Tier](https://oracle.com/cloud/free/)
2. Click "Start for free"
3. Complete registration:
   - Choose home region (closest to you)
   - Add payment method (won't be charged)
   - Verify phone number

##### 2. Create Autonomous Database
1. Open menu ☰ → Oracle Database → Autonomous Database
2. Click "Create Autonomous Database"
3. Configure:
   ```
   Display name: airport-flight-data
   Database name: AIRPORTDB
   Workload: Transaction Processing
   Deployment: Shared Infrastructure
   Version: 19c
   OCPU count: 1
   Storage: 1 TB
   ```
4. Set ADMIN password (save this!)
5. Network access: "Secure access from everywhere"
6. Create Database

##### 3. Download Wallet
1. Click on database name when ready
2. Click "Database connection"
3. Click "Download wallet"
4. Set wallet password (different from ADMIN)
5. Download ZIP file

##### 4. Extract Wallet
```bash
# Create wallet directory
mkdir ~/oracle-wallet
cd ~/oracle-wallet

# Extract (use absolute path!)
unzip ~/Downloads/Wallet_AIRPORTDB.zip

# Verify files
ls -la
# Should see: cwallet.sso, ewallet.p12, sqlnet.ora, tnsnames.ora
```

##### 5. Get Connection String
1. In database page → "Database connection"
2. Copy the "TP" connection string:
```
(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)...
```

##### 6. Create App User (Recommended)
```sql
-- Connect as ADMIN first, then run:
CREATE USER flight_collector IDENTIFIED BY "StrongPass123!";
GRANT CREATE SESSION TO flight_collector;
GRANT CREATE TABLE TO flight_collector;
GRANT CREATE INDEX TO flight_collector;
GRANT UNLIMITED TABLESPACE TO flight_collector;
```

##### 7. Configure Environment
```bash
# .env
DB_PROVIDER=oci
OCI_USER=flight_collector       # or ADMIN
OCI_PASSWORD=StrongPass123!
OCI_CONNECTION_STRING=(description=...)  # Full string from step 5
OCI_WALLET_LOCATION=/home/user/oracle-wallet  # Absolute path!
OCI_WALLET_PASSWORD=wallet_password

# Optional tuning
OCI_POOL_MIN=1
OCI_POOL_MAX=4
```

#### Database Features
- Full SQL support
- JSON native storage
- Automatic indexing
- Point-in-time recovery
- 99.95% SLA

#### Advanced Queries
```sql
-- JSON queries
SELECT f.data.flightNumber, f.data.status
FROM flights f
WHERE JSON_VALUE(f.data, '$.airline') = 'UA'
AND f.collection_date > SYSDATE - 7;

-- Analytics
WITH flight_stats AS (
  SELECT 
    airport,
    EXTRACT(HOUR FROM scheduled_time) as hour,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'DELAYED' THEN 1 ELSE 0 END) as delays
  FROM flights
  GROUP BY airport, EXTRACT(HOUR FROM scheduled_time)
)
SELECT 
  airport,
  hour,
  ROUND(delays * 100.0 / total, 2) as delay_percentage
FROM flight_stats
ORDER BY delay_percentage DESC;
```

## Configuration Reference

### Environment Variables

#### Global Settings
```bash
# Database provider
DB_PROVIDER=local|cloudflare|oci

# Environment (affects table names)
NODE_ENV=development|production

# Table prefix (for multiple projects)
DB_TABLE_PREFIX=airport_flight_data

# Retry settings
DB_RETRY_ATTEMPTS=3
DB_RETRY_DELAY=1000
```

#### Provider-Specific Settings

##### Local Storage
```bash
LOCAL_DATA_DIR=./data
LOCAL_PRETTY_PRINT=true
```

##### Cloudflare D1
```bash
CF_ACCOUNT_ID=your_account_id
CF_DATABASE_ID=your_database_id
CF_API_TOKEN=your_api_token
CF_WORKER_URL=https://optional-worker.workers.dev

# Override global settings
CF_ENVIRONMENT=production
CF_TABLE_PREFIX=custom_prefix
```

##### Oracle Cloud
```bash
OCI_USER=username
OCI_PASSWORD=password
OCI_CONNECTION_STRING=full_connection_string
OCI_WALLET_LOCATION=/absolute/path/to/wallet
OCI_WALLET_PASSWORD=wallet_password

# Connection pool
OCI_POOL_MIN=1
OCI_POOL_MAX=4
OCI_POOL_INCREMENT=1
OCI_POOL_TIMEOUT=60

# Override global settings
OCI_ENVIRONMENT=production
OCI_TABLE_PREFIX=custom_prefix
```

### Table Naming Convention

Tables follow this pattern: `{prefix}_{environment}_{table}`

Examples:
- Development: `airport_flight_data_dev_flights`
- Production: `airport_flight_data_prod_flights`
- Custom: `my_project_prod_flights`

### Multi-Repository Setup

When multiple repos share a database:

```bash
# Repository 1
DB_TABLE_PREFIX=flight_data_v1

# Repository 2  
DB_TABLE_PREFIX=flight_data_v2

# Repository 3
DB_TABLE_PREFIX=flight_data_test
```

## Migration Guide

### Migrating Existing Data

#### Quick Migration (Last 30 Days)
```bash
# To Cloudflare
node scripts/migrate-to-cloudflare.js --recent-only

# To Oracle
node scripts/migrate-to-oci.js --recent-only
```

#### Full Historical Migration
```bash
# Migrate all data (may take time)
node scripts/migrate-to-cloudflare.js

# Migrate specific year
node scripts/migrate-to-cloudflare.js --year 2024

# Migrate specific airport
node scripts/migrate-to-cloudflare.js --airport SFO
```

#### Migration Progress
```
Migrating to Cloudflare D1...
✓ Connected to database
✓ Tables created
Processing SFO...
  ✓ 2024-01-01: 523 flights
  ✓ 2024-01-02: 498 flights
  ... 
Processed 365 files, 185,234 flights total
Migration complete!
```

### Switching Providers

1. **Export from current provider**
```bash
node scripts/export-data.js --format json --output backup.json
```

2. **Update configuration**
```bash
# Update .env
DB_PROVIDER=new_provider
# Add new provider credentials
```

3. **Import to new provider**
```bash
node scripts/import-data.js --input backup.json
```

## Troubleshooting

### Diagnostic Script

First, run the diagnostic tool:

```bash
node scripts/diagnose-db.js
```

Output:
```
🔍 Database Configuration Diagnostic

Provider: cloudflare
✅ CF_ACCOUNT_ID = abc123...
✅ CF_DATABASE_ID = xxx-xxx-xxx
✅ CF_API_TOKEN is set (Z9xKl2p3Q4...)

💡 Next step: node scripts/test-database.js
```

### Common Errors & Solutions

#### Cloudflare D1

**"Authentication error"**
```bash
# Fix: Regenerate token with D1 permissions
# Visit: https://dash.cloudflare.com/profile/api-tokens
# Permissions needed: Account → D1 → Edit
```

**"Database not found"**
```bash
# List your databases
wrangler d1 list

# Use the ID, not name!
# ❌ Wrong: CF_DATABASE_ID=airport-flight-data
# ✅ Right: CF_DATABASE_ID=xxxx-xxxx-xxxx
```

**"Query failed: no such table"**
```bash
# Tables are created automatically
# Just run: node scripts/test-database.js
```

#### Oracle Cloud

**"ORA-12154: TNS could not resolve"**
```bash
# Check connection string format
# Must be one long string starting with (description=...

# Verify wallet location is absolute path
# ❌ Wrong: ./oracle-wallet
# ✅ Right: /home/user/oracle-wallet

# Check wallet files exist
ls -la $OCI_WALLET_LOCATION
```

**"ORA-01017: invalid username/password"**
```bash
# Password is case-sensitive
# Special characters may need escaping in .env
# Try with single quotes: OCI_PASSWORD='Pass@123!'

# Test with SQL Developer first
```

**"ORA-12537: connection closed"**
```bash
# Database may be paused (free tier)
# First connection takes 10-20 seconds
# Or check network access in OCI console
```

#### General Issues

**"MODULE_NOT_FOUND"**
```bash
npm install
# or specifically:
npm install oracledb  # for Oracle
```

**"Connection timeout"**
```bash
# Increase timeout
DB_CONNECTION_TIMEOUT=60000

# Check internet connection
# Try VPN if blocked
```

### Platform-Specific Issues

#### Windows
```powershell
# Use forward slashes in paths
OCI_WALLET_LOCATION=C:/Users/name/oracle-wallet

# Or escape backslashes
OCI_WALLET_LOCATION=C:\\Users\\name\\oracle-wallet
```

#### macOS
```bash
# If oracledb fails
brew install python@3.9
npm install oracledb --python=python3.9
```

#### Linux
```bash
# Missing libaio
sudo apt-get install libaio1  # Ubuntu/Debian
sudo yum install libaio       # CentOS/RHEL
```

## Security Best Practices

### 1. Credential Management

**Never commit secrets:**
```bash
# .gitignore already includes:
.env
.env.*
*.pem
*.key
```

**Use environment-specific files:**
```bash
.env.development
.env.production
.env.test
```

**Rotate credentials regularly:**
- API tokens: Every 90 days
- Passwords: Every 180 days
- Monitor for exposed credentials

### 2. Database Security

**Use least privilege:**
```sql
-- Don't use ADMIN in production
-- Create specific user with minimal rights
GRANT SELECT, INSERT, UPDATE ON flights TO app_user;
```

**Enable network restrictions:**
- Cloudflare: IP allowlisting
- Oracle: Access Control Lists
- Use VPN for production access

**Audit trails:**
```sql
-- Oracle: Enable unified auditing
AUDIT SELECT, INSERT, UPDATE, DELETE ON flights BY app_user;
```

### 3. Application Security

**Validate input:**
```javascript
// Sanitize airport codes
const airport = req.params.airport.toUpperCase().substring(0, 3);
if (!/^[A-Z]{3}$/.test(airport)) {
  throw new Error('Invalid airport code');
}
```

**Use parameterized queries:**
```javascript
// Good - parameterized
const query = 'SELECT * FROM flights WHERE airport = ? AND date = ?';
db.execute(query, [airport, date]);

// Bad - string concatenation
const query = `SELECT * FROM flights WHERE airport = '${airport}'`;
```

### 4. Monitoring

**Set up alerts:**
- Failed login attempts
- Unusual query patterns
- Storage quota warnings
- Connection pool exhaustion

**Log security events:**
```javascript
logger.security({
  event: 'login_attempt',
  user: username,
  ip: req.ip,
  success: false,
  reason: 'invalid_password'
});
```

## Performance Optimization

### Query Optimization

**Add indexes:**
```sql
-- Cloudflare D1
CREATE INDEX idx_flights_date ON flights(collection_date);
CREATE INDEX idx_flights_airport ON flights(airport_code);

-- Oracle
CREATE INDEX idx_flight_search ON flights(
  airport_code, 
  collection_date, 
  flight_status
);
```

**Use connection pooling:**
```bash
# Oracle settings
OCI_POOL_MIN=2
OCI_POOL_MAX=10
OCI_POOL_INCREMENT=2
```

**Batch operations:**
```javascript
// Insert multiple records at once
await db.insertMany(flights, { batchSize: 1000 });
```

### Storage Management

**Data retention:**
```bash
# Archive old data
node scripts/data-retention.js --days 365

# Export before deleting
node scripts/export-data.js --older-than 365
```

**Monitor usage:**
```bash
# Check database size
node scripts/monitor.js --check-size

# Cloudflare: 5GB limit
# Oracle: 20GB per database
```

## Backup Strategies

### Automated Backups

**Cloudflare D1:**
- Automatic daily backups
- 30-day retention
- Point-in-time recovery

**Oracle Cloud:**
- Automatic daily backups
- 60-day retention
- Manual snapshots available

### Manual Backups

```bash
# Export all data
node scripts/backup.js --full

# Export specific date range
node scripts/backup.js --from 2025-01-01 --to 2025-07-31

# Scheduled backup (cron)
0 2 * * * cd /path/to/project && node scripts/backup.js
```

## Support Resources

### Documentation
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Oracle Autonomous Database Docs](https://docs.oracle.com/en/cloud/paas/autonomous-database/)
- [Project Wiki](https://github.com/czhaoca/airport-flight-data-collector/wiki)

### Community
- [GitHub Discussions](https://github.com/czhaoca/airport-flight-data-collector/discussions)
- [Cloudflare Discord](https://discord.cloudflare.com)
- [Oracle Forums](https://forums.oracle.com)

### Getting Help
1. Check this guide first
2. Run diagnostic script
3. Search existing issues
4. Create detailed issue with:
   - Error message
   - Environment details
   - Steps to reproduce
   - Diagnostic output

## Next Steps

1. **Choose your provider** based on your needs
2. **Follow setup instructions** for your chosen provider
3. **Test your connection** with test-database.js
4. **Migrate existing data** if applicable
5. **Set up automation** with GitHub Actions
6. **Monitor and maintain** your database

Happy collecting! 🛫