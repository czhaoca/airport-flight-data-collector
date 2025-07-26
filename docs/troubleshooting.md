# Comprehensive Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Airport Flight Data Collector.

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Common Error Messages](#common-error-messages)
- [Database Issues](#database-issues)
- [Collection Problems](#collection-problems)
- [API & Network Issues](#api--network-issues)
- [GitHub Actions Issues](#github-actions-issues)
- [Performance Problems](#performance-problems)
- [Platform-Specific Issues](#platform-specific-issues)
- [Debug Tools & Techniques](#debug-tools--techniques)
- [Getting Help](#getting-help)

## Quick Diagnostics

### 🔍 Diagnostic Script

Run this first for any issue:

```bash
# Create comprehensive diagnostic script
cat > diagnose-all.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive System Diagnostic\n');
console.log('='.repeat(50));

// 1. Check Node.js version
console.log('\n📦 Environment:');
console.log(`Node.js: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);

// 2. Check .env file
console.log('\n📄 Configuration:');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  require('dotenv').config();
  
  // Check provider
  const provider = process.env.DB_PROVIDER || 'not set';
  console.log(`Database Provider: ${provider}`);
  
  // Provider-specific checks
  if (provider === 'cloudflare') {
    console.log('\nCloudflare Config:');
    console.log(`  Account ID: ${process.env.CF_ACCOUNT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Database ID: ${process.env.CF_DATABASE_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  API Token: ${process.env.CF_API_TOKEN ? '✅ Set' : '❌ Missing'}`);
  } else if (provider === 'oci') {
    console.log('\nOracle Config:');
    console.log(`  User: ${process.env.OCI_USER ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Password: ${process.env.OCI_PASSWORD ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Connection: ${process.env.OCI_CONNECTION_STRING ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Wallet: ${process.env.OCI_WALLET_LOCATION ? '✅ Set' : '❌ Missing'}`);
  }
} else {
  console.log('❌ .env file not found!');
  console.log('   Run: cp .env.template .env');
}

// 3. Check dependencies
console.log('\n📚 Dependencies:');
try {
  const package = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = Object.keys(package.dependencies || {});
  console.log(`Total dependencies: ${deps.length}`);
  
  // Check if node_modules exists
  if (fs.existsSync('node_modules')) {
    console.log('✅ node_modules exists');
  } else {
    console.log('❌ node_modules missing - run: npm install');
  }
} catch (e) {
  console.log('❌ Could not read package.json');
}

// 4. Check network connectivity
console.log('\n🌐 Network:');
const https = require('https');
const urls = [
  { name: 'SFO API', url: 'https://www.flysfo.com' },
  { name: 'YYZ API', url: 'https://www.torontopearson.com' },
  { name: 'GitHub', url: 'https://api.github.com' }
];

async function checkUrl(name, url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`  ${name}: ✅ Reachable (${res.statusCode})`);
      resolve();
    }).on('error', (err) => {
      console.log(`  ${name}: ❌ Unreachable (${err.code})`);
      resolve();
    }).setTimeout(5000);
  });
}

Promise.all(urls.map(u => checkUrl(u.name, u.url))).then(() => {
  console.log('\n💡 Next Steps:');
  console.log('1. Fix any ❌ issues above');
  console.log('2. Run: node scripts/test-database.js');
  console.log('3. Check specific error messages below');
});
EOF

node diagnose-all.js
```

### 🚦 Quick Health Check

```bash
# Test database connection
node scripts/test-database.js

# Test collection for single airport
npm run test:sfo

# Check logs
tail -f logs/collector.log
```

## Common Error Messages

### "Cannot find module"

#### Error
```
Error: Cannot find module 'dotenv'
```

#### Solutions
```bash
# Install all dependencies
npm install

# If specific module is missing
npm install dotenv

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "ECONNREFUSED"

#### Error
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

#### Solutions
1. Check if service is running
2. Verify port is correct
3. Check firewall settings
4. Try different network

```bash
# Check what's using the port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Use different port
PORT=3001 node scripts/health-check.js
```

### "ETIMEDOUT"

#### Error
```
Error: connect ETIMEDOUT
```

#### Solutions
```bash
# Increase timeout
HTTP_TIMEOUT=60000 npm run collect:sfo

# Use curl client (better for timeouts)
HTTP_CLIENT_TYPE=curl npm run collect:sfo

# Check network
ping www.flysfo.com
traceroute www.flysfo.com
```

### "MODULE_NOT_FOUND"

#### Error
```
Error: Cannot find module '../lib/database'
```

#### Solutions
1. Check file paths (case-sensitive on Linux/Mac)
2. Verify file exists
3. Check relative path is correct

```bash
# List files
ls -la lib/

# Check case sensitivity
find . -name "*database*" -type f
```

## Database Issues

### Cloudflare D1 Issues

#### "Authentication error"

**Symptoms:**
```
Cloudflare API error: Authentication error (10000)
```

**Solutions:**
1. **Regenerate API Token**
   ```
   Visit: https://dash.cloudflare.com/profile/api-tokens
   - Create new token
   - Permissions: Account → D1 → Edit
   - Update .env: CF_API_TOKEN=new_token
   ```

2. **Verify Token Format**
   ```bash
   # Token should be 40+ characters
   # Format: Z9xKl2p3Q4r5S6t7U8v9W0...
   echo $CF_API_TOKEN | wc -c
   ```

3. **Check Account ID**
   ```bash
   # Should be 32 characters
   # Format: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   echo $CF_ACCOUNT_ID | wc -c
   ```

#### "Database not found"

**Symptoms:**
```
Failed to connect to Cloudflare D1: Database not found
```

**Solutions:**
1. **List Databases**
   ```bash
   wrangler d1 list
   ```

2. **Use ID not Name**
   ```bash
   # ❌ Wrong
   CF_DATABASE_ID=airport-flight-data
   
   # ✅ Correct
   CF_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

3. **Verify Login**
   ```bash
   wrangler whoami
   ```

#### "Query failed"

**Symptoms:**
```
Query failed: D1_ERROR: no such table: flights
```

**Solution:**
Tables are created automatically. This means connection works!
```bash
node scripts/test-database.js
```

### Oracle Cloud Issues

#### "ORA-12154: TNS could not resolve"

**Symptoms:**
```
ORA-12154: TNS:could not resolve the connect identifier specified
```

**Solutions:**

1. **Check Connection String Format**
   ```bash
   # Must be one long string
   # Should start with: (description=
   # Should contain: (address=(protocol=tcps)
   ```

2. **Verify Wallet Location**
   ```bash
   # Must be absolute path
   ✅ /home/user/oracle-wallet
   ❌ ./oracle-wallet
   ❌ ~/oracle-wallet
   
   # Check files exist
   ls -la $OCI_WALLET_LOCATION
   # Should see: cwallet.sso, ewallet.p12, sqlnet.ora, tnsnames.ora
   ```

3. **Test with SQLcl**
   ```bash
   sql /nolog
   SQL> set cloudconfig /path/to/wallet.zip
   SQL> connect username@service_name
   ```

#### "ORA-01017: invalid username/password"

**Solutions:**

1. **Check Password**
   ```bash
   # Password is case-sensitive
   # Special characters need escaping
   
   # In .env file:
   OCI_PASSWORD="MyPass@123!"  # With quotes
   OCI_PASSWORD='MyPass@123!'  # Or single quotes
   ```

2. **Verify Username**
   ```bash
   # Default is ADMIN (uppercase)
   # Custom user should exist
   OCI_USER=ADMIN
   ```

3. **Test Manually**
   ```sql
   -- Connect with SQL Developer first
   -- Verify credentials work
   ```

#### "ORA-12537: TNS connection closed"

**Solutions:**

1. **Database Auto-Pause**
   ```bash
   # Free tier databases pause after inactivity
   # First connection takes 10-20 seconds
   # Solution: Retry after waiting
   ```

2. **Check Network Access**
   ```
   OCI Console → Autonomous Database → DB Connection
   → Access Control List → Edit
   → Add your IP or "Access from anywhere"
   ```

3. **Wallet Issues**
   ```bash
   # Re-download wallet
   # Extract to new location
   # Update OCI_WALLET_LOCATION
   ```

## Collection Problems

### No Data Collected

**Diagnosis:**
```bash
# Check last collection
ls -la data/SFO/ | tail -5

# Check logs
grep ERROR logs/collector.log

# Run manual collection with verbose
VERBOSE=true npm run collect:sfo
```

**Common Causes:**
1. API changes
2. Network issues
3. Bot protection
4. Rate limiting

### Partial Data

**Symptoms:**
- Some flights missing
- Incomplete date range
- Missing airports

**Solutions:**
```javascript
// Add retry logic
const MAX_RETRIES = 3;
let attempt = 0;

while (attempt < MAX_RETRIES) {
  try {
    const data = await collector.collect();
    if (data.flights.length > 0) break;
  } catch (error) {
    attempt++;
    await sleep(Math.pow(2, attempt) * 1000);
  }
}
```

### Bot Protection

**Symptoms:**
```
Error: CAPTCHA detected
Error: 403 Forbidden
Error: Browser verification required
```

**Solutions:**

1. **Use Curl Client**
   ```bash
   HTTP_CLIENT_TYPE=curl npm run collect:yyz
   ```

2. **Add Delays**
   ```bash
   YYZ_DELAY_BETWEEN_REQUESTS=20000 npm run collect:yyz
   ```

3. **Use Puppeteer**
   ```bash
   HTTP_CLIENT_TYPE=puppeteer npm run collect:yvr
   ```

4. **Rotate User Agents**
   ```javascript
   const userAgents = [
     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
     'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
   ];
   
   const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
   ```

## API & Network Issues

### SSL/TLS Errors

**Error:**
```
Error: unable to verify the first certificate
```

**Solutions:**
```bash
# Temporary (NOT for production)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run collect:sfo

# Better solution - update certificates
npm install -g npm
npm config set strict-ssl true
```

### Proxy Issues

**Behind Corporate Proxy:**
```bash
# Set proxy
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# For npm
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

### DNS Resolution

**Error:**
```
Error: getaddrinfo ENOTFOUND www.flysfo.com
```

**Solutions:**
```bash
# Test DNS
nslookup www.flysfo.com
dig www.flysfo.com

# Use different DNS
# Add to /etc/resolv.conf (Linux/Mac)
nameserver 8.8.8.8
nameserver 1.1.1.1

# Windows
netsh interface ip set dns "Wi-Fi" static 8.8.8.8
```

## GitHub Actions Issues

### Workflow Not Running

**Check:**
1. Actions enabled in repository
2. Workflow file in `.github/workflows/`
3. Correct YAML syntax
4. Schedule syntax correct

**Debug:**
```yaml
# Add debug output
- name: Debug Environment
  run: |
    echo "Provider: ${{ secrets.DB_PROVIDER }}"
    echo "Has CF Token: ${{ secrets.CF_API_TOKEN != '' }}"
    env | grep -E '^(DB_|CF_|OCI_)' | sed 's/=.*/=***/'
```

### Secrets Not Working

**Common Issues:**
1. Secret names must match exactly (case-sensitive)
2. No spaces in secret values
3. Quotes not needed in GitHub Secrets

**Verify:**
```yaml
- name: Test Secrets
  run: |
    if [ -z "${{ secrets.DB_PROVIDER }}" ]; then
      echo "DB_PROVIDER secret is not set!"
      exit 1
    fi
```

### Workflow Timeouts

**Solutions:**
```yaml
jobs:
  collect:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Increase timeout
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Collect with retry
        uses: nick-invision/retry@v2
        with:
          timeout_minutes: 10
          max_attempts: 3
          retry_on: error
          command: npm run collect:all
```

## Performance Problems

### Slow Collection

**Diagnosis:**
```bash
# Time the collection
time npm run collect:sfo

# Profile the code
node --prof src/collect.js
node --prof-process isolate-*.log > profile.txt
```

**Optimizations:**
1. Enable connection pooling
2. Use parallel requests
3. Implement caching
4. Optimize queries

### High Memory Usage

**Monitor:**
```bash
# Watch memory usage
node --expose-gc scripts/collect.js

# In code
console.log('Memory:', process.memoryUsage());
```

**Solutions:**
```javascript
// Stream large datasets
const stream = db.queryStream('SELECT * FROM flights');
stream.on('data', processRow);
stream.on('end', () => global.gc());

// Clear large objects
largeArray = null;
global.gc?.();
```

### Database Slow

**Cloudflare D1:**
```sql
-- Add indexes
CREATE INDEX idx_flights_date ON flights(collection_date);
CREATE INDEX idx_flights_airport ON flights(airport_code);

-- Analyze query
EXPLAIN QUERY PLAN 
SELECT * FROM flights 
WHERE airport_code = 'SFO' 
AND collection_date > '2025-07-01';
```

**Oracle:**
```sql
-- Gather statistics
EXEC DBMS_STATS.GATHER_TABLE_STATS('FLIGHT_COLLECTOR', 'FLIGHTS');

-- Check execution plan
EXPLAIN PLAN FOR
SELECT * FROM flights WHERE airport = 'SFO';

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

## Platform-Specific Issues

### Windows

#### Path Issues
```powershell
# Use forward slashes
$env:OCI_WALLET_LOCATION="C:/Users/name/wallet"

# Or escape backslashes
$env:OCI_WALLET_LOCATION="C:\\Users\\name\\wallet"
```

#### Permission Issues
```powershell
# Run as Administrator
# Or fix npm permissions
npm config set prefix %USERPROFILE%\npm
```

### macOS

#### Certificate Issues
```bash
# Update certificates
brew install ca-certificates
brew upgrade ca-certificates

# For Python dependencies
brew install python@3.9
npm install oracledb --python=python3.9
```

#### Port Issues
```bash
# Check what's using port
sudo lsof -i :3000

# Kill process
kill -9 <PID>
```

### Linux

#### Missing Libraries
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  libaio1 \
  build-essential \
  python3-dev

# CentOS/RHEL
sudo yum install -y \
  libaio \
  gcc-c++ \
  python3-devel
```

#### Permission Issues
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Debug Tools & Techniques

### Enable Debug Logging

```bash
# Set debug environment variables
DEBUG=* npm run collect:sfo
VERBOSE=true LOG_LEVEL=debug npm run collect:sfo

# Custom debug function
cat > debug.js << 'EOF'
const debug = require('debug');

module.exports = {
  db: debug('app:database'),
  http: debug('app:http'),
  collector: debug('app:collector')
};
EOF
```

### Network Debugging

```bash
# Capture HTTP traffic
mitmdump -p 8080 --mode upstream:http://proxy:8080

# Use with Node.js
HTTP_PROXY=http://localhost:8080 npm run collect:sfo
```

### Database Query Logging

```javascript
// Log all queries
const originalQuery = db.query;
db.query = async function(sql, params) {
  console.log('SQL:', sql);
  console.log('Params:', params);
  const start = Date.now();
  try {
    const result = await originalQuery.call(this, sql, params);
    console.log(`Duration: ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};
```

### Memory Profiling

```javascript
// Take heap snapshots
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot(name) {
  const filename = `heap-${name}-${Date.now()}.heapsnapshot`;
  const stream = fs.createWriteStream(filename);
  v8.writeHeapSnapshot(stream);
  console.log(`Heap snapshot written to ${filename}`);
}

// Usage
takeHeapSnapshot('before-collection');
await collect();
takeHeapSnapshot('after-collection');
```

## Getting Help

### Before Asking for Help

1. **Run diagnostics**
   ```bash
   node diagnose-all.js
   node scripts/test-database.js
   ```

2. **Check logs**
   ```bash
   tail -100 logs/collector.log | grep ERROR
   ```

3. **Search existing issues**
   - [GitHub Issues](https://github.com/czhaoca/airport-flight-data-collector/issues)
   - Search for your error message

### Creating a Good Issue

**Title:** Clear, specific description
```
❌ "It doesn't work"
✅ "Cloudflare D1 authentication error with valid token"
```

**Body:** Include:
```markdown
## Environment
- OS: macOS 12.6
- Node.js: v18.17.0
- Database: Cloudflare D1
- Error first occurred: 2025-07-26

## Error Message
```
Error: Cloudflare API error: Authentication error (10000)
```

## Steps to Reproduce
1. Set up Cloudflare D1 with valid credentials
2. Run `npm run collect:sfo`
3. Error occurs immediately

## What I've Tried
- Regenerated API token
- Verified account ID is correct
- Ran diagnostic script (output attached)

## Diagnostic Output
[Paste output of diagnose-all.js]
```

### Community Resources

- **GitHub Discussions**: For questions and help
- **Issues**: For bugs and feature requests
- **Wiki**: For additional documentation

### Emergency Contacts

For critical production issues:
1. Check status pages:
   - [Cloudflare Status](https://www.cloudflarestatus.com/)
   - [Oracle Cloud Status](https://ocistatus.oraclecloud.com/)
2. Contact support through your provider
3. Use fallback collection methods

## Quick Reference Card

### Most Common Fixes

| Problem | Quick Fix |
|---------|-----------|
| Module not found | `npm install` |
| Database connection failed | Check credentials in .env |
| CAPTCHA/403 | Use curl: `HTTP_CLIENT_TYPE=curl` |
| Timeout | Increase: `HTTP_TIMEOUT=60000` |
| No data | Check API manually, verify date |
| GitHub Action fails | Check secrets are set |

### Essential Commands

```bash
# Diagnose issues
node diagnose-all.js

# Test database
node scripts/test-database.js

# Verbose collection
VERBOSE=true npm run collect:sfo

# Use different HTTP client
HTTP_CLIENT_TYPE=curl npm run collect:yyz

# Check recent data
ls -la data/SFO/ | tail -5

# View logs
tail -f logs/collector.log
```

Remember: Most issues are configuration-related. Double-check your .env file and credentials first!