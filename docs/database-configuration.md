# Database Configuration Guide

This guide explains how to configure the database adapters for the airport flight data collector, including support for multiple environments and database prefixes.

## Environment Configuration

The system supports three database providers: Local (file system), Oracle Cloud Infrastructure (OCI), and Cloudflare D1.

### Global Environment Variables

```bash
# Database provider selection
DB_PROVIDER=local|oci|cloudflare

# Global environment setting (affects all providers)
NODE_ENV=development|production

# Global table prefix (for multi-repo deployments)
DB_TABLE_PREFIX=airport_flight_data
```

### Table Naming Convention

Tables are automatically prefixed based on environment and repository to prevent conflicts when multiple repositories share the same database:

```
{tablePrefix}_{environment}_{tableName}
```

Examples:
- Development: `airport_flight_data_dev_flights`
- Production: `airport_flight_data_prod_flights`
- Custom prefix: `my_repo_prod_flights`

## Provider-Specific Configuration

### Local Provider

The local provider stores data as JSON files and doesn't use table prefixes.

```bash
# Local data directory
LOCAL_DATA_DIR=/path/to/data

# Pretty print JSON files (default: true)
LOCAL_PRETTY_PRINT=true
```

### Oracle Cloud Infrastructure (OCI)

```bash
# Required OCI configuration
OCI_USER=your_username
OCI_PASSWORD=your_password
OCI_CONNECTION_STRING=your_connection_string

# Optional OCI configuration
OCI_WALLET_LOCATION=/path/to/wallet
OCI_WALLET_PASSWORD=wallet_password

# Connection pool settings
OCI_POOL_MIN=1
OCI_POOL_MAX=4
OCI_POOL_INCREMENT=1
OCI_POOL_TIMEOUT=60

# Override environment and prefix for OCI
OCI_ENVIRONMENT=production  # Overrides NODE_ENV
OCI_TABLE_PREFIX=custom_prefix  # Overrides DB_TABLE_PREFIX
```

### Cloudflare D1

```bash
# Required Cloudflare configuration
CF_ACCOUNT_ID=your_account_id
CF_DATABASE_ID=your_database_id
CF_API_TOKEN=your_api_token

# Optional Worker URL for enhanced performance
CF_WORKER_URL=https://your-worker.workers.dev

# Override environment and prefix for Cloudflare
CF_ENVIRONMENT=production  # Overrides NODE_ENV
CF_TABLE_PREFIX=custom_prefix  # Overrides DB_TABLE_PREFIX
```

## Multi-Repository Deployment

When deploying multiple repositories to the same database, use unique table prefixes to avoid conflicts:

### Repository 1: Airport Flight Data
```bash
DB_TABLE_PREFIX=airport_flight_data
NODE_ENV=production
```
Tables: `airport_flight_data_prod_flights`, `airport_flight_data_prod_flight_status_history`

### Repository 2: Weather Data Collector
```bash
DB_TABLE_PREFIX=weather_data
NODE_ENV=production
```
Tables: `weather_data_prod_flights`, `weather_data_prod_flight_status_history`

## Development vs Production

### Development Environment
```bash
NODE_ENV=development
DB_TABLE_PREFIX=airport_flight_data
```
- Tables prefixed with `dev_`
- Easier debugging and testing
- Separate from production data

### Production Environment
```bash
NODE_ENV=production
DB_TABLE_PREFIX=airport_flight_data
```
- Tables prefixed with `prod_`
- Optimized for performance
- Stricter data validation

## Migration Between Environments

When migrating data between environments, the scripts automatically handle table prefixes:

```bash
# Migrate from development to production
NODE_ENV=development npm run export
NODE_ENV=production npm run import
```

## Testing Configuration

For testing, you can use a separate prefix:

```bash
# Test environment
NODE_ENV=development
DB_TABLE_PREFIX=test_airport_data
```

## Example Configurations

### Simple Local Development
```bash
DB_PROVIDER=local
```

### OCI Development with Custom Prefix
```bash
DB_PROVIDER=oci
NODE_ENV=development
DB_TABLE_PREFIX=my_airport_project
OCI_USER=dev_user
OCI_PASSWORD=dev_password
OCI_CONNECTION_STRING=dev_db_connection
```

### Cloudflare Production Deployment
```bash
DB_PROVIDER=cloudflare
NODE_ENV=production
DB_TABLE_PREFIX=airport_flight_data
CF_ACCOUNT_ID=prod_account
CF_DATABASE_ID=prod_database
CF_API_TOKEN=prod_token
```

### Multi-Environment Setup
```bash
# Development
DB_PROVIDER=cloudflare
CF_ENVIRONMENT=development
CF_TABLE_PREFIX=airport_dev

# Staging
DB_PROVIDER=cloudflare
CF_ENVIRONMENT=staging
CF_TABLE_PREFIX=airport_staging

# Production
DB_PROVIDER=cloudflare
CF_ENVIRONMENT=production
CF_TABLE_PREFIX=airport_prod
```

## Health Check Output

The health check now includes environment and table information:

```json
{
  "status": "healthy",
  "provider": "cloudflare",
  "environment": "production",
  "tablePrefix": "airport_flight_data",
  "tables": {
    "flights": "airport_flight_data_prod_flights",
    "status": "airport_flight_data_prod_flight_status_history"
  }
}
```

## Troubleshooting

### Table Name Conflicts
If you encounter table name conflicts:
1. Ensure each repository uses a unique `DB_TABLE_PREFIX`
2. Check that environments are correctly set
3. Verify table names in health check output

### Environment Variable Priority
Provider-specific environment variables override global settings:
1. `CF_ENVIRONMENT` > `NODE_ENV`
2. `CF_TABLE_PREFIX` > `DB_TABLE_PREFIX`

### Database Size Limits
- Cloudflare D1: 5GB limit per database
- Consider archiving old data when approaching limits
- Use different databases for different environments