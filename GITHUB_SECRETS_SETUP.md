# GitHub Secrets Setup Guide

This document explains how to configure GitHub repository secrets for the Airport Flight Data Collector workflow to save data to different database providers.

## Table of Contents

1. [Common Secrets](#common-secrets)
2. [Oracle Cloud Infrastructure (OCI) Database](#oracle-cloud-infrastructure-oci-database)
3. [Cloudflare D1 Database](#cloudflare-d1-database)
4. [Database Provider Selection](#database-provider-selection)
5. [Testing Your Configuration](#testing-your-configuration)

## Common Secrets

These secrets are used regardless of the database provider:

### `PAT_GITHUB` (Required)
- **Description**: GitHub Personal Access Token for API access
- **Where to get it**:
  1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Click "Generate new token (classic)"
  3. Give it a descriptive name (e.g., "Airport Data Collector")
  4. Select scopes: `repo` (full control of private repositories)
  5. Click "Generate token" and copy the token immediately
- **Format**: `ghp_xxxxxxxxxxxxxxxxxxxx`

### `DB_PROVIDER` (Optional)
- **Description**: Default database provider for scheduled runs
- **Valid values**: `local`, `oci`, `cloudflare`
- **Default**: `local` (if not set)
- **Note**: Can be overridden when manually triggering the workflow

### `DB_TABLE_PREFIX` (Optional)
- **Description**: Prefix for database table names
- **Default**: `airport_flight_data`
- **Use case**: Allows multiple instances or environments to share the same database

## Oracle Cloud Infrastructure (OCI) Database

To use OCI Autonomous Database or other Oracle databases:

### Required Secrets

#### `OCI_USER`
- **Description**: Database username
- **Where to get it**: 
  - For Autonomous Database: Usually `ADMIN` or a custom user you created
  - Found in: OCI Console → Autonomous Database → Database Connection → Username
- **Format**: `ADMIN` or your custom username

#### `OCI_PASSWORD`
- **Description**: Database password
- **Where to get it**: 
  - Set when creating the Autonomous Database
  - Can be reset in: OCI Console → Autonomous Database → More Actions → Administrator Password
- **Format**: Strong password (min 12 chars, including uppercase, lowercase, number, and special character)

#### `OCI_CONNECTION_STRING`
- **Description**: Oracle connection string
- **Where to get it**:
  1. OCI Console → Autonomous Database → Database Connection
  2. Click "Download client credentials (Wallet)"
  3. Open the downloaded wallet ZIP file
  4. Look in `tnsnames.ora` for connection strings
  5. Choose the appropriate service level (e.g., `_high`, `_medium`, `_low`)
- **Format Examples**:
  - `adb.us-ashburn-1.oraclecloud.com:1522/abc123_high.adb.oraclecloud.com`
  - `(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=abc123_high.adb.oraclecloud.com))(security=(ssl_server_cert_dn="CN=adwc.uscom-east-1.oraclecloud.com, OU=Oracle BMCS US, O=Oracle Corporation, L=Redwood City, ST=California, C=US")))`

### Optional Secrets (Required for Autonomous Database)

#### `OCI_WALLET_LOCATION`
- **Description**: Path to wallet files (for secure connections)
- **Where to get it**: 
  1. Download wallet from OCI Console → Autonomous Database → Database Connection
  2. Extract the wallet files to a secure location
  3. In GitHub Actions, this is typically set to a temporary directory
- **Format**: `/tmp/wallet` or similar path
- **Note**: The wallet files themselves need to be base64 encoded and stored as secrets

#### `OCI_WALLET_PASSWORD`
- **Description**: Password for the wallet (if wallet is password-protected)
- **Where to get it**: Set when downloading the wallet from OCI Console
- **Format**: The password you set when downloading the wallet

### Setting up OCI Wallet in GitHub Actions

Since GitHub Actions runs in ephemeral environments, you need to store wallet files as secrets:

1. Download the wallet ZIP file from OCI Console
2. Base64 encode the entire ZIP file:
   ```bash
   base64 -i Wallet_YourDatabase.zip -o wallet_base64.txt
   ```
3. Create a secret `OCI_WALLET_ZIP_BASE64` with the content of `wallet_base64.txt`
4. Add a step in your workflow to decode and extract the wallet:
   ```yaml
   - name: Setup OCI Wallet
     if: env.DB_PROVIDER == 'oci'
     run: |
       echo "${{ secrets.OCI_WALLET_ZIP_BASE64 }}" | base64 -d > wallet.zip
       mkdir -p /tmp/wallet
       unzip -o wallet.zip -d /tmp/wallet
       echo "OCI_WALLET_LOCATION=/tmp/wallet" >> $GITHUB_ENV
   ```

## Cloudflare D1 Database

To use Cloudflare's D1 serverless SQL database:

### Required Secrets

#### `CF_ACCOUNT_ID`
- **Description**: Your Cloudflare account ID
- **Where to get it**:
  1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
  2. Select your account
  3. Look in the right sidebar under "Account ID"
  4. Or find it in the URL: `https://dash.cloudflare.com/:account_id/`
- **Format**: `32-character-hexadecimal-string`
- **Example**: `a1b2c3d4e5f6789012345678901234567`

#### `CF_DATABASE_ID`
- **Description**: Your D1 database ID
- **Where to get it**:
  1. Cloudflare Dashboard → Workers & Pages → D1
  2. Click on your database
  3. Find the Database ID in the database details
  4. Or use Wrangler CLI: `wrangler d1 list`
- **Format**: `UUID format`
- **Example**: `12345678-1234-1234-1234-123456789012`

#### `CF_API_TOKEN`
- **Description**: Cloudflare API token with D1 edit permissions
- **Where to get it**:
  1. Cloudflare Dashboard → My Profile → API Tokens
  2. Click "Create Token"
  3. Use "Custom token" template
  4. Set permissions:
     - Account → D1 → Edit
     - (Optional) Account → Cloudflare Workers Scripts → Edit
  5. Set account resources to your specific account
  6. Continue to summary → Create Token
  7. Copy the token immediately (it won't be shown again)
- **Format**: `Long alphanumeric string`
- **Security note**: This token should have minimal required permissions

### Optional Secrets

#### `CF_WORKER_URL`
- **Description**: Custom Worker URL for D1 access
- **Use case**: If you have a Cloudflare Worker acting as a proxy for D1 access
- **Where to get it**: 
  - Your deployed Worker URL from Workers & Pages → Your Worker
- **Format**: `https://your-worker.your-subdomain.workers.dev`

## Database Provider Selection

The workflow determines which database to use in this priority order:

1. **Manual trigger input**: When manually running the workflow, you can select the provider
2. **Repository secret**: `DB_PROVIDER` secret value
3. **Default**: `local` (SQLite database)

### Setting Database Provider Priority

```yaml
# In the workflow, this line determines the provider:
echo "DB_PROVIDER=${{ github.event.inputs.db_provider || secrets.DB_PROVIDER || 'local' }}" >> $GITHUB_ENV
```

## Testing Your Configuration

### 1. Set up secrets in GitHub:
1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its name and value
4. Click "Add secret"

### 2. Test with manual workflow dispatch:
1. Go to Actions → "Collect Flight Data (Database)"
2. Click "Run workflow"
3. Select:
   - Branch: `main` (or your working branch)
   - Airport: `all` (or specific airport)
   - Database provider: Your configured provider
4. Click "Run workflow"

### 3. Monitor the workflow:
- Check the workflow run logs
- Look for the "Test Database Connection" step
- Verify data is being saved to your chosen database

### 4. Troubleshooting:

#### OCI Connection Issues:
- Verify wallet files are properly extracted
- Check firewall rules allow connection from GitHub Actions IPs
- Ensure the connection string matches your service level
- Verify the database is not paused/stopped

#### Cloudflare Connection Issues:
- Verify API token has correct permissions
- Check account ID and database ID are correct
- Ensure D1 database is active and not at quota limits
- Check API token hasn't expired

#### Common Issues:
- **Authentication failed**: Double-check credentials
- **Connection timeout**: Check network/firewall settings
- **Table not found**: Run database migration workflow first
- **Permission denied**: Verify API tokens/user permissions

## Security Best Practices

1. **Rotate credentials regularly**
   - Set calendar reminders to rotate tokens/passwords
   - Update GitHub secrets when credentials change

2. **Use least privilege**
   - Create dedicated database users with minimal required permissions
   - Limit API token scopes to only what's needed

3. **Monitor access**
   - Review GitHub Actions logs regularly
   - Enable database audit logging where available
   - Monitor for unusual access patterns

4. **Protect production databases**
   - Consider using separate databases for testing
   - Implement database backups before major changes
   - Use read-only credentials where possible

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OCI Autonomous Database Documentation](https://docs.oracle.com/en/cloud/paas/autonomous-database/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)