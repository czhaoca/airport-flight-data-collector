# Airport Flight Data Collector

A robust, SOLID-principles-based application for collecting real-time flight data from major airports. Built with clean architecture, dependency injection, and comprehensive error handling for reliable, automated data collection.

## 🎯 Overview

This system automatically collects flight data from:
- **San Francisco International Airport (SFO)** - Daily collection with historical data support
- **Toronto Pearson International Airport (YYZ)** - Real-time arrivals and departures with bot protection handling
- **Vancouver International Airport (YVR)** - Advanced browser automation for Cloudflare bypass

The application features a modular architecture that makes it easy to add new airports, switch storage backends, or modify collection strategies.

## ✨ Features

- 🏗️ **Clean Architecture**: SOLID principles with dependency injection
- 🔄 **Automatic Retry**: Exponential backoff for transient failures
- 💾 **Multiple Storage Backends**: Local files or GitHub repository
- 🔌 **Pluggable HTTP Clients**: Choose between fetch, curl, or Puppeteer
- 🤖 **Browser Automation**: Puppeteer integration for advanced bot protection
- 📊 **Comprehensive Logging**: Structured logs with multiple levels
- 🛡️ **Bot Protection Handling**: Smart strategies including Cloudflare bypass
- 🧪 **Fully Testable**: Mock dependencies for unit testing
- ⚙️ **Environment Configuration**: Flexible deployment options
- 📅 **Historical Data**: Complete archive since August 2024

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) GitHub account for GitHub Actions
- (Optional) Personal Access Token for GitHub storage

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/airport-flight-data-collector.git
cd airport-flight-data-collector

# Install dependencies
npm install
```

### Basic Usage

```bash
# Collect from all configured airports
npm run collect

# Collect from specific airport
npm run collect:sfo
npm run collect:yyz
node src/collect_yvr_data.js

# Test mode (saves to test directory)
npm run test:sfo
npm run test:yyz
```

### Advanced Usage

```bash
# Use curl instead of fetch (better for bot protection)
HTTP_CLIENT_TYPE=curl npm run collect

# Use Puppeteer for advanced bot protection (required for YVR)
HTTP_CLIENT_TYPE=puppeteer node src/collect_yvr_data.js

# Enable verbose logging
VERBOSE=true npm run collect

# Collect for specific date
node src/application/commands/collect.js SFO --date 2025-07-24

# Use GitHub storage
STORAGE_TYPE=github \
GITHUB_TOKEN=your-token \
GITHUB_REPOSITORY=owner/repo \
npm run collect
```

### GitHub Actions Setup (Optional)

For automated daily collection:

1. **Fork this repository**
2. **Create a Personal Access Token** with `repo` scope
3. **Add as repository secret**: `PAT_GITHUB`
4. **Enable GitHub Actions** in your repository
5. **Automatic execution**:
   - YYZ: Daily at 11:55 PM EST
   - SFO: Daily at 6:00 AM PST
   - YVR: Manual or scheduled (requires Puppeteer)

## 📊 Data Structure

### Storage Organization
```
data/
├── sfo/
│   └── sfo_flights_YYYY-MM-DD.json
├── yyz/
│   ├── yyz_departures_YYYY-MM-DD.json
│   └── yyz_arrivals_YYYY-MM-DD.json
└── yvr/
    └── yvr_flights_YYYY-MM-DD.json
```

### Data Coverage
- **Historical Range**: August 2024 - Present
- **Update Frequency**: Daily
- **File Naming**: Date represents the actual flight date (current day for YYZ, previous day for SFO)
- **Format**: Structured JSON with consistent schema

### Sample Data Fields
**SFO Data**:
- Flight numbers, airlines, destinations
- Scheduled vs actual times
- Gate information, flight status
- Aircraft type and registration

**YYZ Data**:
- Separate departure and arrival files
- Flight details, airline information
- Terminal and gate assignments
- Real-time status updates

**YVR Data**:
- Combined arrivals and departures
- Full airline names and codes
- Gate and terminal information
- Real-time status with remarks

## 🏗️ Architecture

The application follows clean architecture principles with clear separation of concerns:

```
src/
├── core/              # Business logic and interfaces
│   ├── interfaces/    # Abstract contracts (IDataCollector, IHttpClient, etc.)
│   ├── models/        # Domain models (Flight, CollectionResult)
│   └── errors/        # Custom error types
├── infrastructure/    # External dependencies
│   ├── http/          # HTTP clients (NodeFetchClient, CurlClient)
│   ├── storage/       # Storage services (LocalFileStorage, GitHubStorage)
│   ├── logging/       # Logger implementation
│   ├── retry/         # Retry strategies
│   └── config/        # Configuration management
├── domain/            # Domain-specific logic
│   └── collectors/    # Airport collectors (SFOCollector, YYZCollector, YVRCollector)
└── application/       # Application layer
    ├── services/      # Application services (CollectorService)
    └── commands/      # CLI commands
```

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## ⚙️ Configuration

Configuration is managed through environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `STORAGE_TYPE` | Storage backend (`local` or `github`) | `local` | No |
| `STORAGE_BASE_PATH` | Base path for data storage | `data` | No |
| `HTTP_CLIENT_TYPE` | HTTP client (`fetch`, `curl`, or `puppeteer`) | `fetch` | No |
| `HTTP_TIMEOUT` | Request timeout in milliseconds | `30000` | No |
| `VERBOSE` | Enable verbose logging | `false` | No |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` | No |
| `GITHUB_TOKEN` | GitHub Personal Access Token | - | Yes (if using GitHub storage) |
| `GITHUB_REPOSITORY` | Repository in `owner/repo` format | - | Yes (if using GitHub storage) |

### Storage Options

**Local Storage** (Default):
- Data saved to `data/` directory
- Logs saved to `logs/` directory (git-ignored)
- No authentication required

**GitHub Storage**:
- Data automatically committed to repository
- Requires Personal Access Token with `repo` scope
- Set `STORAGE_TYPE=github` and provide token

## 🤝 Contributing

### Adding New Airports

To add support for a new airport:

1. Create a new collector class in `src/domain/collectors/`:
```javascript
const BaseAirportCollector = require('./BaseAirportCollector');

class JFKCollector extends BaseAirportCollector {
  getAirportCode() {
    return 'JFK';
  }
  
  async prepareRequest(options) {
    // Implementation
  }
  
  async transformData(rawData, options) {
    // Implementation
  }
}
```

2. Register in service container (`src/application/services/ServiceContainer.js`)
3. Add configuration for the new airport

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed instructions.

### Development Guidelines

- Follow SOLID principles
- Write unit tests for new features
- Use dependency injection
- Add comprehensive error handling
- Update documentation

## 🛠️ Troubleshooting

### Bot Protection / Captcha Issues
- Use curl HTTP client: `HTTP_CLIENT_TYPE=curl npm run collect`
- For Cloudflare protection (YVR): Use Puppeteer automatically
- Add delays between requests
- Check logs in `logs/` directory for details

### Storage Issues
- **GitHub**: Ensure token has `repo` write permissions
- **Local**: Check disk space and write permissions

### Missing Data
- Verify API endpoints are accessible
- Check environment variables are set correctly
- Review logs for specific error messages

### Migration from Legacy Code
If upgrading from the previous version, see [docs/MIGRATION.md](docs/MIGRATION.md).

## 📈 Project Structure

```
airport-flight-data-collector/
├── .github/workflows/         # GitHub Actions workflows
├── data/                      # Historical flight data (git-tracked)
│   ├── sfo/                   # SFO flight data
│   └── yyz/                   # YYZ arrivals/departures
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # Architecture details
│   └── MIGRATION.md           # Migration guide
├── logs/                      # Application logs (git-ignored)
├── src/                       # Source code
│   ├── application/           # Application layer
│   ├── core/                  # Core business logic
│   ├── domain/                # Domain-specific code
│   └── infrastructure/        # External dependencies
├── tests/                     # Test files
│   ├── fixtures/              # Test data
│   ├── integration/           # Integration tests
│   └── unit/                  # Unit tests
└── package.json               # Project configuration
```

## 📊 Dataset Statistics

- **Historical Data**: August 2024 - Present
- **Airports**: SFO, YYZ, YVR (expandable)
- **Update Frequency**: Daily automated collection
- **Data Format**: Structured JSON
- **Storage**: Local files or GitHub repository

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development plans and upcoming features.

## 🙏 Acknowledgments

- Airport APIs for providing public flight data
- Contributors and maintainers
- Open source community