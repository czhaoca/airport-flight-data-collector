# Database Setup Guide

This guide will help you set up your own database account for each supported provider.

## Quick Start

1. Copy the environment template:
   ```bash
   cp .env.template .env
   ```

2. Choose your database provider and follow the appropriate setup guide below.

3. Fill in your credentials in the `.env` file.

4. Test your connection:
   ```bash
   npm run test
   ```

## Provider Setup Guides

### Option 1: Local File System (Default)

The simplest option - no database account needed!

```bash
# .env configuration
DB_PROVIDER=local
LOCAL_DATA_DIR=./data
```

**Pros:**
- No setup required
- Easy to inspect data
- Good for development

**Cons:**
- Not suitable for production
- No query capabilities
- Limited to local machine

### Option 2: Oracle Cloud Infrastructure (OCI)

#### Step 1: Create an Oracle Cloud Account
1. Go to [Oracle Cloud](https://www.oracle.com/cloud/free/)
2. Sign up for a free tier account (includes 2 Autonomous Databases)
3. Verify your email and complete registration

#### Step 2: Create an Autonomous Database
1. Log into [Oracle Cloud Console](https://cloud.oracle.com/)
2. Navigate to **Menu** → **Oracle Database** → **Autonomous Database**
3. Click **Create Autonomous Database**
4. Configure:
   - **Compartment**: Choose your compartment
   - **Display name**: `airport-flight-data`
   - **Database name**: `AIRPORTDB`
   - **Workload type**: Transaction Processing
   - **Deployment type**: Shared Infrastructure
   - **Database version**: 19c (or latest)
   - **OCPU count**: 1 (free tier)
   - **Storage**: 1 TB (free tier)
5. Set admin password (save this!)
6. Choose network access:
   - **Secure access from everywhere** (easier)
   - Or configure private endpoint (more secure)
7. Click **Create Autonomous Database**

#### Step 3: Download Wallet
1. Once database is active, click on its name
2. Click **Database Connection**
3. Click **Download Wallet**
4. Create a wallet password
5. Extract the wallet zip file to a secure location

#### Step 4: Get Connection Details
1. In the database details page, click **Database Connection**
2. Copy the connection string (choose `TP` for transaction processing)
3. Note your database name and admin username

#### Step 5: Configure Environment
```bash
# .env configuration
DB_PROVIDER=oci
OCI_USER=ADMIN
OCI_PASSWORD=your_admin_password
OCI_CONNECTION_STRING=your_connection_string_from_step4
OCI_WALLET_LOCATION=/path/to/wallet/directory
OCI_WALLET_PASSWORD=your_wallet_password
```

#### Step 6: Create Application User (Recommended)
```sql
-- Connect as ADMIN first
CREATE USER flight_collector IDENTIFIED BY "Strong_Password_123";
GRANT CREATE SESSION TO flight_collector;
GRANT CREATE TABLE TO flight_collector;
GRANT CREATE INDEX TO flight_collector;
GRANT UNLIMITED TABLESPACE TO flight_collector;

-- Update .env to use new user
-- OCI_USER=flight_collector
-- OCI_PASSWORD=Strong_Password_123
```

### Option 3: Cloudflare D1

#### Step 1: Create a Cloudflare Account
1. Go to [Cloudflare](https://dash.cloudflare.com/sign-up)
2. Sign up for a free account
3. Verify your email

#### Step 2: Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

#### Step 3: Create a D1 Database
```bash
# Create database
wrangler d1 create airport-flight-data

# Output will show:
# ✅ Successfully created DB 'airport-flight-data'
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "airport-flight-data"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### Step 4: Get Account ID
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select any domain (or Workers & Pages)
3. On the right sidebar, find your **Account ID**

#### Step 5: Create API Token
1. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Custom token** template
4. Configure:
   - **Token name**: `airport-flight-data`
   - **Permissions**:
     - Account → D1 → Edit
     - Account → Workers Scripts → Edit (if using Workers)
   - **Account Resources**: Include your account
   - **TTL**: Optional expiration
5. Click **Continue to summary** → **Create Token**
6. Copy the token (you won't see it again!)

#### Step 6: Configure Environment
```bash
# .env configuration
DB_PROVIDER=cloudflare
CF_ACCOUNT_ID=your_account_id_from_step4
CF_DATABASE_ID=your_database_id_from_step3
CF_API_TOKEN=your_api_token_from_step5
```

#### Step 7: (Optional) Deploy Worker for Better Performance
```bash
# Create worker
cd workers
wrangler publish

# Get your worker URL
# Update .env with:
# CF_WORKER_URL=https://airport-flight-data.your-subdomain.workers.dev
```

## Environment-Specific Configuration

### Development Setup
```bash
NODE_ENV=development
DB_TABLE_PREFIX=airport_dev

# Creates tables:
# - airport_dev_dev_flights
# - airport_dev_dev_flight_status_history
```

### Production Setup
```bash
NODE_ENV=production
DB_TABLE_PREFIX=airport_prod

# Creates tables:
# - airport_prod_prod_flights
# - airport_prod_prod_flight_status_history
```

### Multi-Project Setup
If you're running multiple projects on the same database:

**Project 1 - Flight Data:**
```bash
DB_TABLE_PREFIX=flight_data
```

**Project 2 - Weather Data:**
```bash
DB_TABLE_PREFIX=weather_data
```

**Project 3 - Airline Stats:**
```bash
DB_TABLE_PREFIX=airline_stats
```

## Testing Your Configuration

### 1. Test Database Connection
```bash
# Create a test script
cat > test-connection.js << 'EOF'
const { getDatabase } = require('./lib/database');

async function testConnection() {
  try {
    const db = await getDatabase();
    const health = await db.healthCheck();
    console.log('Database connection successful!');
    console.log('Health check:', JSON.stringify(health, null, 2));
    await db.disconnect();
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
EOF

# Run the test
node test-connection.js
```

### 2. Test Data Collection
```bash
# Test mode - collects one day of data
npm run test:yyz
npm run test:sfo
```

### 3. Verify Table Creation
The system will automatically create tables on first use. Check your database:

**OCI:**
```sql
SELECT table_name FROM user_tables;
```

**Cloudflare:**
```bash
wrangler d1 execute airport-flight-data --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## Troubleshooting

### OCI Issues

**"ORA-12154: TNS:could not resolve the connect identifier"**
- Check your connection string format
- Ensure wallet files are in the correct location
- Verify wallet password is correct

**"ORA-01017: invalid username/password"**
- Double-check username and password
- Ensure password doesn't contain special characters that need escaping
- Try connecting with SQL Developer first

### Cloudflare Issues

**"Authentication error"**
- Verify your API token has D1 permissions
- Check that account ID is correct
- Ensure token hasn't expired

**"Database not found"**
- Verify database ID from `wrangler d1 list`
- Ensure you're using the ID, not the name

### General Issues

**"Table already exists"**
- This is normal - the system checks for existing tables
- If you need to reset, manually drop tables first

**"Environment variable not set"**
- Ensure .env file is in the project root
- Check that required variables are not commented out
- Restart your application after changing .env

## Security Best Practices

1. **Never commit .env files**
   - Already added to .gitignore
   - Use GitHub Secrets for CI/CD

2. **Use least privilege**
   - Create dedicated database users
   - Grant only necessary permissions

3. **Rotate credentials regularly**
   - Update API tokens every 90 days
   - Change database passwords periodically

4. **Monitor usage**
   - Check Cloudflare Analytics
   - Monitor OCI billing/usage
   - Set up alerts for anomalies

## Next Steps

1. Set up automated collection with GitHub Actions
2. Configure data retention policies
3. Set up monitoring and alerts
4. Implement data archival for long-term storage

## Support

- [Oracle Cloud Documentation](https://docs.oracle.com/en/cloud/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Project Issues](https://github.com/czhaoca/airport-flight-data-collector/issues)