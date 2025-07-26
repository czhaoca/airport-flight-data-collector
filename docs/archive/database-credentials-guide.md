# Database Credentials Setup Guide

This guide provides detailed, step-by-step instructions for setting up each database provider and obtaining the credentials needed for your `.env` file.

## Table of Contents
- [Local Provider (No Setup Required)](#local-provider)
- [Cloudflare D1 Setup](#cloudflare-d1-setup)
- [Oracle Cloud Infrastructure (OCI) Setup](#oracle-cloud-infrastructure-setup)
- [Quick Reference](#quick-reference)

---

## Local Provider

No credentials needed! This is the default option.

### .env Configuration
```bash
DB_PROVIDER=local
LOCAL_DATA_DIR=./data
LOCAL_PRETTY_PRINT=true
```

---

## Cloudflare D1 Setup

### Prerequisites
- A Cloudflare account (free tier available)
- Node.js installed on your computer

### Step 1: Create a Cloudflare Account

1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Enter your email and password
3. Click "Sign up"
4. Verify your email address

### Step 2: Get Your Account ID

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. On the right sidebar, look for "Account ID"
3. Click the copy button next to it
4. **Save this as `CF_ACCOUNT_ID`**

![Account ID Location](https://developers.cloudflare.com/assets/images/account-id-location.png)

### Step 3: Install Wrangler CLI

Open your terminal and run:

```bash
npm install -g wrangler
```

### Step 4: Login to Wrangler

```bash
wrangler login
```

This will open your browser. Click "Allow" to authorize Wrangler.

### Step 5: Create D1 Database

In your terminal, run:

```bash
wrangler d1 create airport-flight-data
```

You'll see output like:
```
✅ Successfully created DB 'airport-flight-data' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via point-in-time restore.

[[d1_databases]]
binding = "DB" # i.e. available in your Worker on env.DB
database_name = "airport-flight-data"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Save the `database_id` value as `CF_DATABASE_ID`**

### Step 6: Create API Token

1. Go to [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Click "Get started" next to "Create Custom Token"

4. Configure the token:
   - **Token name**: `airport-flight-data`
   - **Permissions**: 
     - Click "Add" 
     - Account → D1 → Edit
     - Account → Workers Scripts → Edit (optional, for Worker deployment)
   - **Account Resources**: 
     - Include → Select your account
   - **IP Address Filtering** (optional): Add your IP for extra security
   - **TTL**: Set an expiration date (optional)

5. Click "Continue to summary"
6. Review and click "Create Token"
7. **IMPORTANT**: Copy the token immediately - you won't see it again!
8. **Save this as `CF_API_TOKEN`**

### Step 7: (Optional) Get Worker URL

If you deployed the Worker:

```bash
cd workers
wrangler deploy
```

The output will show:
```
Total Upload: xx.xx KiB / gzip: x.xx KiB
Uploaded airport-flight-data-api (x.xx sec)
Published airport-flight-data-api (x.xx sec)
  https://airport-flight-data-api.your-subdomain.workers.dev
```

**Save the URL as `CF_WORKER_URL`**

### Final .env Configuration

```bash
# Cloudflare D1 Configuration
DB_PROVIDER=cloudflare
CF_ACCOUNT_ID=your_account_id_from_step_2
CF_DATABASE_ID=your_database_id_from_step_5
CF_API_TOKEN=your_api_token_from_step_6
CF_WORKER_URL=https://your-worker.workers.dev  # Optional

# Environment settings
NODE_ENV=development
DB_TABLE_PREFIX=airport_flight_data
```

---

## Oracle Cloud Infrastructure Setup

### Prerequisites
- Credit card for verification (won't be charged for free tier)
- Phone number for verification

### Step 1: Create Oracle Cloud Account

1. Go to [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)
2. Click "Start for free"
3. Fill in the registration form:
   - Country/Territory
   - Name and email
   - Create a password
4. Click "Verify my email"
5. Check your email and click the verification link

### Step 2: Complete Account Information

1. **Account Information**:
   - Cloud Account Name: Choose a unique name (e.g., `yourname-cloud`)
   - Home Region: Select the closest region to you
   
2. **Address Information**: Fill in your address

3. **Payment Verification**:
   - Add a credit card (for verification only)
   - You won't be charged unless you upgrade

4. Accept the agreement and click "Start my free trial"

### Step 3: Create Autonomous Database

1. Once logged in, click the **☰** menu (top-left)
2. Navigate to **Oracle Database** → **Autonomous Database**
3. Click **Create Autonomous Database**

4. Fill in the form:
   - **Display name**: `airport-flight-data`
   - **Database name**: `AIRPORTDB`
   - **Choose a workload type**: Transaction Processing
   - **Choose a deployment type**: Shared Infrastructure
   - **Choose database version**: 19c (or latest)
   - **OCPU count**: 1
   - **Storage (TB)**: 1
   - **Auto scaling**: Off (for free tier)

5. **Create administrator credentials**:
   - Username: `ADMIN` (pre-filled)
   - Password: Create a strong password (save this!)
   - Confirm password
   - **Save this password as part of `OCI_PASSWORD`**

6. **Choose network access**: 
   - Select "Secure access from everywhere"
   - (Or configure specific IPs for better security)

7. **Choose a license type**: License Included

8. Click **Create Autonomous Database**

9. Wait for the database to be created (2-3 minutes)

### Step 4: Download Wallet

1. Once the database is **Available**, click on its name
2. Click **Database connection** button
3. Click **Download wallet**
4. Create a wallet password (different from admin password)
5. **Save this password as `OCI_WALLET_PASSWORD`**
6. Click **Download**
7. Save the wallet zip file to a secure location

### Step 5: Extract Wallet

```bash
# Create a wallet directory
mkdir ~/oracle-wallet

# Extract the wallet
unzip Wallet_AIRPORTDB.zip -d ~/oracle-wallet/
```

**Save the path as `OCI_WALLET_LOCATION`** (e.g., `/home/youruser/oracle-wallet`)

### Step 6: Get Connection String

1. In the database details page, click **Database connection**
2. Under **Connection Strings**, find the "TP" (Transaction Processing) entry
3. Copy the connection string (it looks like):
   ```
   (description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.region.oraclecloud.com))(connect_data=(service_name=xxxxx_airportdb_tp.adb.oraclecloud.com))(security=(ssl_server_cert_dn="CN=adb.region.oraclecloud.com, OU=Oracle BMCS US, O=Oracle Corporation, L=Redwood City, ST=California, C=US")))
   ```
4. **Save this as `OCI_CONNECTION_STRING`**

### Step 7: (Recommended) Create Application User

1. Download SQL Developer or use Cloud Shell
2. Connect as ADMIN user
3. Run these SQL commands:

```sql
-- Create a dedicated user for the application
CREATE USER flight_collector IDENTIFIED BY "YourStrongPassword123!";

-- Grant necessary permissions
GRANT CREATE SESSION TO flight_collector;
GRANT CREATE TABLE TO flight_collector;
GRANT CREATE INDEX TO flight_collector;
GRANT UNLIMITED TABLESPACE TO flight_collector;

-- Grant permissions for JSON operations
GRANT EXECUTE ON DBMS_JSON TO flight_collector;
```

**Use `flight_collector` as `OCI_USER` and the password as `OCI_PASSWORD`**

### Final .env Configuration

```bash
# Oracle Cloud Infrastructure Configuration
DB_PROVIDER=oci
OCI_USER=flight_collector  # or ADMIN if you didn't create a user
OCI_PASSWORD=YourStrongPassword123!
OCI_CONNECTION_STRING=(description= (retry_count=20)...)  # Full connection string from step 6
OCI_WALLET_LOCATION=/home/youruser/oracle-wallet
OCI_WALLET_PASSWORD=your_wallet_password

# Optional pool settings
OCI_POOL_MIN=1
OCI_POOL_MAX=4
OCI_POOL_INCREMENT=1
OCI_POOL_TIMEOUT=60

# Environment settings
NODE_ENV=development
DB_TABLE_PREFIX=airport_flight_data
```

---

## Quick Reference

### Testing Your Credentials

After setting up your `.env` file, test the connection:

```bash
node scripts/test-database.js
```

You should see:
```
✅ Connection successful!
✅ Health check passed!
```

### Common Issues and Solutions

#### Cloudflare D1

**"Authentication error"**
- Regenerate your API token
- Ensure token has D1 permissions
- Check account ID is correct

**"Database not found"**
- Run `wrangler d1 list` to see your databases
- Verify you're using the database ID, not the name

#### Oracle Cloud

**"ORA-12154: TNS:could not resolve the connect identifier"**
- Check connection string format
- Ensure wallet files are extracted
- Verify wallet path is absolute, not relative

**"ORA-01017: invalid username/password"**
- Passwords are case-sensitive
- Special characters may need escaping
- Try connecting with SQL Developer first

**"ORA-12537: TNS:connection closed"**
- Check network access settings in OCI console
- Ensure your IP is whitelisted (if using ACL)

### Security Best Practices

1. **Never commit `.env` files to Git**
2. **Use GitHub Secrets for production**
3. **Rotate API tokens every 90 days**
4. **Use dedicated database users (not ADMIN)**
5. **Enable network restrictions when possible**
6. **Store wallet files securely**
7. **Use strong, unique passwords**

### Getting Help

- **Cloudflare D1**: [Discord](https://discord.cloudflare.com) or [Community Forum](https://community.cloudflare.com/c/developers/d1/85)
- **Oracle Cloud**: [Support Portal](https://support.oracle.com) or [Forums](https://forums.oracle.com/ords/apexds/domain/dev-community)
- **Project Issues**: [GitHub Issues](https://github.com/czhaoca/airport-flight-data-collector/issues)

### Next Steps

1. Choose your database provider
2. Follow the setup guide above
3. Test your connection
4. Run the migration script to import existing data
5. Configure GitHub Actions with your secrets

Remember: Both Cloudflare and Oracle offer free tiers that are sufficient for this project!