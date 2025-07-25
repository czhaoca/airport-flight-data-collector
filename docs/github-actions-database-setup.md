# GitHub Actions Database Setup

This guide explains how to configure GitHub Actions for database storage instead of committing to the repository.

## Benefits of Database Storage

- **Reduced Repository Size**: No more daily commits inflating repo size
- **Better Performance**: Query data directly without parsing JSON files
- **Scalability**: Handle years of data without repository limitations
- **Professional Deployment**: Production-ready data storage

## Setup Steps

### 1. Choose Your Database Provider

- **Local** (default): Continue using file system (no changes needed)
- **Cloudflare D1**: Best for serverless, edge deployments
- **Oracle Cloud**: Best for enterprise features and free tier

### 2. Add GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

#### Common Secrets

```bash
# Database provider (local, cloudflare, or oci)
DB_PROVIDER=cloudflare

# Table prefix (to avoid conflicts with other projects)
DB_TABLE_PREFIX=airport_flight_data

# Existing GitHub token for fallback file commits
PAT_GITHUB=your_existing_token
```

#### Cloudflare Secrets

```bash
CF_ACCOUNT_ID=your_account_id
CF_DATABASE_ID=your_database_id
CF_API_TOKEN=your_api_token
CF_WORKER_URL=https://your-worker.workers.dev  # Optional
```

#### Oracle Cloud Secrets

```bash
OCI_USER=your_username
OCI_PASSWORD=your_password
OCI_CONNECTION_STRING=your_connection_string

# Optional: For wallet-based authentication
OCI_WALLET_BASE64=base64_encoded_wallet_zip
OCI_WALLET_PASSWORD=wallet_password
```

### 3. Encoding Oracle Wallet (if needed)

If using Oracle Cloud with wallet authentication:

```bash
# Encode your wallet for GitHub Secrets
base64 -i wallet.zip -o wallet_base64.txt

# On macOS:
base64 -i wallet.zip > wallet_base64.txt

# Copy the contents of wallet_base64.txt to OCI_WALLET_BASE64 secret
```

### 4. Enable New Workflow

The repository now includes two workflows:

1. **Original Workflow** (`collect-flight-data.yml`): 
   - Continues to work as before with file commits
   - No changes needed

2. **Database Workflow** (`collect-flight-data-db.yml`):
   - Uses database storage based on secrets
   - Falls back to local storage if no database configured
   - Includes health checks and error reporting

### 5. Disable File Commits (Optional)

Once database storage is working, you can disable the original workflow:

1. Go to Actions tab
2. Click on "Collect Flight Data"
3. Click "..." menu → Disable workflow

Or rename the file:
```bash
mv .github/workflows/collect-flight-data.yml .github/workflows/collect-flight-data.yml.disabled
```

## Testing Your Setup

### Manual Test Run

1. Go to Actions tab
2. Select "Collect Flight Data (Database)"
3. Click "Run workflow"
4. Choose options:
   - Airport: all, yyz, or sfo
   - Database provider: local, oci, or cloudflare
5. Click "Run workflow"

### Verify Data Collection

Check the workflow logs for:
- ✅ "Database connection successful"
- ✅ "Save successful!"
- ✅ Records saved to database

### Database Health Check

The workflow includes automatic health checks that show:
- Database connection status
- Table information
- Recent data summary

## Migration Workflow

Use the "Database Migration" workflow to migrate existing data:

1. Go to Actions → Database Migration
2. Click "Run workflow"
3. Select:
   - Provider: cloudflare or oci
   - Migration type:
     - `test`: Dry run without changes
     - `recent-only`: Last 30 days
     - `full`: All historical data
   - Airport (optional): Specific airport
   - Year (optional): Specific year

## Monitoring

### Workflow Status

- Check Actions tab for workflow runs
- Failed runs will upload logs as artifacts
- Email notifications for failures (if enabled)

### Database Monitoring

#### Cloudflare D1
- Dashboard: Workers & Pages → D1
- Monitor storage usage (5GB limit)
- Check query performance

#### Oracle Cloud
- OCI Console → Autonomous Database
- Monitor storage and performance
- Set up alerts for usage

## Troubleshooting

### "Database not connected" Error

1. Verify secrets are set correctly
2. Check provider name matches (case-sensitive)
3. Test connection locally with same credentials

### "Authentication failed" Error

**Cloudflare:**
- Regenerate API token with D1 permissions
- Verify account ID is correct

**Oracle:**
- Check username/password
- Verify connection string format
- Ensure wallet files are accessible

### "Table not found" Error

- Tables are created automatically on first use
- Check table prefix configuration
- Verify environment (dev vs prod)

### Performance Issues

- Enable Worker URL for Cloudflare
- Increase connection pool for Oracle
- Use recent-only migration for large datasets

## Best Practices

1. **Start with Test Migration**: Always run dry-run first
2. **Monitor Storage**: Set alerts before limits
3. **Use Appropriate Environment**: Production for real data
4. **Rotate Credentials**: Update tokens periodically
5. **Backup Important Data**: Before major changes

## Rollback Plan

If you need to revert to file-based storage:

1. Re-enable original workflow
2. Set `DB_PROVIDER=local` or remove the secret
3. Data remains in files as backup

## Cost Considerations

### Cloudflare D1
- Free tier: 5GB storage, 5 million reads/day
- Paid: $0.75/GB/month after free tier

### Oracle Cloud
- Always Free: 2 × 20GB Autonomous Databases
- No charge within free tier limits

## Next Steps

1. Set up data retention policies
2. Create API endpoints for data access
3. Build dashboards with the data
4. Set up automated backups

## Support

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/pricing/)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)