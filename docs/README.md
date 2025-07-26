# Airport Flight Data Collector Documentation

Welcome to the comprehensive documentation for the Airport Flight Data Collector project.

## 📚 Documentation Index

### Getting Started
- [**Quick Setup Guide**](credentials-quick-setup.md) - Get running in 10 minutes
- [**Database Setup Guide**](database-setup-guide.md) - Choose and configure your database
- [**Environment Configuration**](database-configuration.md) - Configure your environment

### Database Credentials
- [**Step-by-Step Credentials Guide**](database-credentials-guide.md) - Detailed walkthrough with screenshots
- [**Credentials Troubleshooting**](credentials-troubleshooting.md) - Fix common credential issues
- [**Quick Setup**](credentials-quick-setup.md) - Fast track setup guide

### Implementation Guides
- [**Database Interface Usage**](database-interface-usage.md) - How to use the database interface
- [**GitHub Actions Setup**](github-actions-database-setup.md) - Configure automated collection
- [**Database Selection Analysis**](database-selection-analysis.md) - Why we chose these databases

### Technical Documentation
- [**TICKET-001**](tickets/TICKET-001-data-collection-interface.md) - Data Collection Interface Design
- [**TICKET-002**](tickets/TICKET-002-oci-database-implementation.md) - Oracle Cloud Implementation
- [**TICKET-003**](tickets/TICKET-003-cloudflare-database-implementation.md) - Cloudflare D1 Implementation

## 🚀 Quick Start Paths

### I want to...

#### **Start collecting flight data immediately**
1. Use local storage (default): No setup needed!
2. Run: `npm install && npm test`

#### **Set up a production database**
1. Choose your provider:
   - [Cloudflare D1](credentials-quick-setup.md#option-1-cloudflare-d1-recommended-for-beginners) - Quick & serverless
   - [Oracle Cloud](credentials-quick-setup.md#option-2-oracle-cloud-best-free-tier) - More storage & features
2. Follow the [Step-by-Step Guide](database-credentials-guide.md)
3. Test with: `node scripts/test-database.js`

#### **Migrate existing data to a database**
1. Set up credentials ([guide](database-credentials-guide.md))
2. Run migration:
   ```bash
   # Recent data only (faster)
   node scripts/migrate-to-cloudflare.js --recent-only
   
   # All historical data
   node scripts/migrate-to-cloudflare.js
   ```

#### **Fix connection issues**
- Check [Troubleshooting Guide](credentials-troubleshooting.md)
- Run diagnostic: `node diagnose-db.js`

## 📊 Quick Reference

### Database Comparison

| Feature | Local (File) | Cloudflare D1 | Oracle Cloud |
|---------|--------------|---------------|---------------|
| **Setup Time** | 0 minutes | 10 minutes | 20 minutes |
| **Free Tier** | Unlimited | 5GB | 2×20GB |
| **Best For** | Development | Edge/Serverless | Enterprise |
| **Query Speed** | N/A | Fast | Fastest |
| **SQL Support** | ❌ | ✅ SQLite | ✅ Full SQL |
| **Complexity** | None | Low | Medium |

### Supported Airports

| Airport | Code | API Status | Data Availability |
|---------|------|------------|-------------------|
| San Francisco | SFO | ✅ Stable | Previous day |
| Toronto Pearson | YYZ | ✅ Stable | Current day |
| Vancouver | YVR | ✅ Stable | Current day |


## 🛠️ Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-database.js` | Test database connection | `node scripts/test-database.js` |
| `migrate-to-cloudflare.js` | Migrate to Cloudflare D1 | `node scripts/migrate-to-cloudflare.js [options]` |
| `migrate-to-oci.js` | Migrate to Oracle Cloud | `node scripts/migrate-to-oci.js [options]` |
| `health-check.js` | HTTP health endpoint | `node scripts/health-check.js` |
| `api-server.js` | REST API server | `node scripts/api-server.js` |
| `monitor.js` | Database monitoring | `node scripts/monitor.js [--check-once]` |
| `data-retention.js` | Archive/delete old data | `node scripts/data-retention.js [--dry-run]` |

## 📝 Environment Variables

### Essential Variables
```bash
# Database provider: local, cloudflare, or oci
DB_PROVIDER=cloudflare

# Environment: development or production
NODE_ENV=development

# Table prefix for multi-repo support
DB_TABLE_PREFIX=airport_flight_data
```

### Provider-Specific
See [Database Configuration](database-configuration.md) for complete list.

## 🔐 Security Notes

1. **Never commit `.env` files**
2. **Use GitHub Secrets for production**
3. **Rotate credentials regularly**
4. **Use least-privilege database users**
5. **Enable network restrictions**

## 🆘 Getting Help

1. **Check documentation first** - Most answers are here
2. **Run diagnostics** - `node diagnose-db.js`
3. **Search issues** - [GitHub Issues](https://github.com/czhaoca/airport-flight-data-collector/issues)
4. **Ask community** - Open a new issue

## 📈 Project Status

- ✅ Local file storage
- ✅ Cloudflare D1 support
- ✅ Oracle Cloud support
- ✅ Automated collection
- ✅ Data retention policies
- ✅ Health monitoring
- ✅ REST API
- 🚧 Dashboard (coming soon)

---

Last updated: 2024