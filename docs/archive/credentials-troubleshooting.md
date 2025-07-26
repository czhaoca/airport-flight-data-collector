# Credentials Troubleshooting Guide

## 🔍 Diagnostic Tool

First, run our diagnostic script to identify issues:

```bash
# Create diagnostic script
cat > diagnose-db.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('🔍 Database Configuration Diagnostic\n');

// Check .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('   Run: cp .env.template .env');
  process.exit(1);
}

// Load environment
require('dotenv').config();

// Check provider
const provider = process.env.DB_PROVIDER;
console.log(`Provider: ${provider || 'NOT SET ❌'}`);

if (!provider) {
  console.log('\n💡 Set DB_PROVIDER to: local, cloudflare, or oci');
  process.exit(1);
}

// Provider-specific checks
console.log('\n📋 Checking credentials...\n');

if (provider === 'cloudflare') {
  const checks = {
    CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID,
    CF_DATABASE_ID: process.env.CF_DATABASE_ID,
    CF_API_TOKEN: process.env.CF_API_TOKEN
  };
  
  for (const [key, value] of Object.entries(checks)) {
    if (!value) {
      console.log(`❌ ${key} is missing`);
    } else if (key === 'CF_API_TOKEN') {
      console.log(`✅ ${key} is set (${value.substring(0, 10)}...)`);
    } else {
      console.log(`✅ ${key} = ${value}`);
    }
  }
  
  // Validate format
  if (checks.CF_DATABASE_ID && !checks.CF_DATABASE_ID.match(/^[0-9a-f-]{36}$/)) {
    console.log('\n⚠️  CF_DATABASE_ID should be a UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
  }
  
} else if (provider === 'oci') {
  const checks = {
    OCI_USER: process.env.OCI_USER,
    OCI_PASSWORD: process.env.OCI_PASSWORD,
    OCI_CONNECTION_STRING: process.env.OCI_CONNECTION_STRING,
    OCI_WALLET_LOCATION: process.env.OCI_WALLET_LOCATION
  };
  
  for (const [key, value] of Object.entries(checks)) {
    if (!value) {
      console.log(`❌ ${key} is missing`);
    } else if (key === 'OCI_PASSWORD') {
      console.log(`✅ ${key} is set (hidden)`);
    } else if (key === 'OCI_CONNECTION_STRING') {
      console.log(`✅ ${key} is set (${value.substring(0, 30)}...)`);
    } else {
      console.log(`✅ ${key} = ${value}`);
    }
  }
  
  // Check wallet
  if (checks.OCI_WALLET_LOCATION) {
    if (!fs.existsSync(checks.OCI_WALLET_LOCATION)) {
      console.log(`\n❌ Wallet directory not found: ${checks.OCI_WALLET_LOCATION}`);
    } else {
      const walletFiles = fs.readdirSync(checks.OCI_WALLET_LOCATION);
      const requiredFiles = ['cwallet.sso', 'ewallet.p12', 'sqlnet.ora', 'tnsnames.ora'];
      const missing = requiredFiles.filter(f => !walletFiles.includes(f));
      
      if (missing.length > 0) {
        console.log(`\n⚠️  Missing wallet files: ${missing.join(', ')}`);
      } else {
        console.log('\n✅ All wallet files present');
      }
    }
  }
}

console.log('\n💡 Next step: node scripts/test-database.js\n');
EOF

node diagnose-db.js
```

---

## 🚨 Common Error Messages & Solutions

### Cloudflare D1 Errors

#### Error: "Authentication error"
```
Cloudflare API error: Authentication error
```

**Solutions:**
1. Regenerate your API token:
   ```
   https://dash.cloudflare.com/profile/api-tokens
   → Create Token → Custom Token
   → Account → D1 → Edit
   ```

2. Check token format:
   ```bash
   # Should start with:
   CF_API_TOKEN=Z9xKl2p3Q4r5S6t7U8v9W0...
   ```

3. Verify permissions:
   - Must have: Account → D1 → Edit
   - Optional: Account → Workers Scripts → Edit

---

#### Error: "Database not found"
```
Failed to connect to Cloudflare D1: Database not found
```

**Solutions:**
1. List your databases:
   ```bash
   wrangler d1 list
   ```

2. Use the ID, not the name:
   ```bash
   # ❌ Wrong:
   CF_DATABASE_ID=airport-flight-data
   
   # ✅ Correct:
   CF_DATABASE_ID=a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
   ```

3. Check you're in the right account:
   ```bash
   wrangler whoami
   ```

---

#### Error: "Query failed: D1_ERROR"
```
Query failed: D1_ERROR: no such table: flights
```

**Solution:**
Tables are created automatically on first use. This error means the connection works! Run:
```bash
node scripts/test-database.js
```

---

### Oracle Cloud Errors

#### Error: "ORA-12154"
```
ORA-12154: TNS:could not resolve the connect identifier specified
```

**Solutions:**
1. Check connection string format:
   ```bash
   # Should be one long string starting with:
   OCI_CONNECTION_STRING=(description= (retry_count=20)(retry_delay=3)...
   ```

2. Verify wallet location:
   ```bash
   # Must be absolute path:
   OCI_WALLET_LOCATION=/home/username/oracle-wallet
   
   # Not relative:
   # ❌ ./oracle-wallet
   # ❌ ~/oracle-wallet (use full path)
   ```

3. Check wallet extraction:
   ```bash
   ls -la $OCI_WALLET_LOCATION
   # Should show: cwallet.sso, ewallet.p12, sqlnet.ora, tnsnames.ora
   ```

---

#### Error: "ORA-01017"
```
ORA-01017: invalid username/password; logon denied
```

**Solutions:**
1. Password is case-sensitive:
   ```bash
   # If you set: MyPassword123!
   # Don't use: mypassword123!
   ```

2. Special characters need escaping in .env:
   ```bash
   # If password has quotes:
   OCI_PASSWORD=My\"Pass\"word
   
   # Or use single quotes:
   OCI_PASSWORD='My"Pass"word'
   ```

3. Test with SQL Developer first

4. Try ADMIN user:
   ```bash
   OCI_USER=ADMIN
   OCI_PASSWORD=YourAdminPassword
   ```

---

#### Error: "ORA-12537"
```
ORA-12537: TNS:connection closed
```

**Solutions:**
1. Check network access in OCI Console:
   - Go to your Autonomous Database
   - Click "DB Connection"
   - Check "Access Control List"
   - Add your IP or select "Access from anywhere"

2. Wait for database to wake up:
   - Free tier databases auto-pause
   - First connection takes 10-20 seconds
   - Retry after waiting

---

#### Error: "Cannot find module 'oracledb'"
```
Error: Cannot find module 'oracledb'
```

**Solution:**
```bash
npm install
# or
npm install oracledb
```

Note: Oracle Instant Client is included in the npm package.

---

## 🔧 Platform-Specific Issues

### Windows
```powershell
# Use forward slashes in paths:
OCI_WALLET_LOCATION=C:/Users/username/oracle-wallet

# Or escape backslashes:
OCI_WALLET_LOCATION=C:\\Users\\username\\oracle-wallet
```

### macOS
```bash
# If oracledb fails to install:
brew install python@3.9
npm install oracledb --python=python3.9
```

### Linux
```bash
# If missing libaio:
sudo apt-get install libaio1  # Ubuntu/Debian
sudo yum install libaio       # CentOS/RHEL
```

---

## 📝 Validation Script

Create this script to validate your setup:

```bash
cat > validate-setup.js << 'EOF'
async function validateSetup() {
  console.log('🔍 Validating Database Setup...\n');
  
  const provider = process.env.DB_PROVIDER;
  
  if (provider === 'cloudflare') {
    // Test API access
    console.log('Testing Cloudflare API...');
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CF_API_TOKEN}`
          }
        }
      );
      
      if (response.ok) {
        console.log('✅ API authentication successful');
      } else {
        console.log('❌ API authentication failed:', response.status);
        const error = await response.text();
        console.log(error);
      }
    } catch (error) {
      console.log('❌ API request failed:', error.message);
    }
  }
  
  // Test database connection
  console.log('\nTesting database connection...');
  try {
    const { getDatabase } = require('./lib/database');
    const db = await getDatabase();
    const health = await db.healthCheck();
    console.log('✅ Database connection successful');
    console.log('   Status:', health.status);
    await db.disconnect();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

validateSetup();
EOF

node validate-setup.js
```

---

## 🆘 Still Having Issues?

### 1. Enable Debug Mode
```bash
# Add to .env
DEBUG=true

# Run with verbose output
node scripts/test-database.js --verbose
```

### 2. Check Prerequisites
- Node.js version 18+: `node --version`
- NPM packages installed: `npm list`
- Internet connection for API calls

### 3. Get Help
- **Error Logs**: Check for detailed error messages
- **GitHub Issues**: Search existing issues or create new
- **Discord/Forums**: 
  - Cloudflare: https://discord.cloudflare.com
  - Oracle: https://forums.oracle.com

### 4. Reset and Start Fresh
```bash
# Backup current .env
cp .env .env.backup

# Start with fresh template
cp .env.template .env

# Re-enter credentials carefully
```

---

## 📚 Additional Resources

- [Cloudflare D1 Troubleshooting](https://developers.cloudflare.com/d1/platform/troubleshooting/)
- [Oracle Cloud Connection Issues](https://docs.oracle.com/en/cloud/paas/autonomous-database/adbsa/troubleshoot-connect.html)
- [Project Documentation](https://github.com/czhaoca/airport-flight-data-collector/tree/main/docs)