# Airport Flight Data Collector

An automated flight data collection system that gathers comprehensive flight information from major international airports using GitHub Actions. This project provides a robust solution for tracking flight schedules, delays, cancellations, and other operational data.

## 🎯 Overview

This system automatically collects flight data from:
- **San Francisco International Airport (SFO)** - Daily at 6:00 AM PST
- **Toronto Pearson International Airport (YYZ)** - Both departures and arrivals daily at 11:55 PM EST

The data is collected using official airport APIs and stored in structured JSON format, making it suitable for analysis, monitoring, and research purposes.

## ✨ Features

- **Automated Daily Collection**: Scheduled data collection via GitHub Actions
- **Dual Airport Support**: SFO and YYZ (departures and arrivals)
- **Robust Error Handling**: Comprehensive logging and error recovery
- **GitHub Integration**: Automatic data storage in repository
- **Local Development**: Full support for local testing and development
- **Manual Triggering**: On-demand data collection via GitHub Actions
- **Structured Data**: Clean JSON format with consistent schema
- **Historical Archive**: Maintains complete historical dataset since August 2024

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for local development)
- GitHub account with Actions enabled

### Setup

1. **Fork this repository** to your GitHub account

2. **Create a Personal Access Token (PAT)**:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Name: `Airport Data Collector`
   - Expiration: Choose appropriate duration
   - Scopes: Select `repo` (full control of repositories)
   - Click "Generate token" and **copy the token**

3. **Add the PAT as a repository secret**:
   - Go to your forked repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `PAT_GITHUB`
   - Value: Paste your Personal Access Token
   - Click "Add secret"

4. **Enable GitHub Actions**:
   - Navigate to the Actions tab in your repository
   - Enable workflows if prompted
   - The "Collect Flight Data" workflow should appear

5. **Automatic execution**:
   - YYZ data: Daily at 11:55 PM EST (4:55 UTC)
   - SFO data: Daily at 6:00 AM PST (2:00 PM UTC)
   - Manual trigger: Actions tab → "Collect Flight Data" → "Run workflow"

## 📊 Data Structure

### Storage Organization
```
data/
├── sfo/
│   └── sfo_flights_YYYY-MM-DD.json
└── yyz/
    ├── yyz_departures_YYYY-MM-DD.json
    └── yyz_arrivals_YYYY-MM-DD.json
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

## 💻 Local Development

### Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/airport-flight-data-collector.git
cd airport-flight-data-collector

# Install dependencies
npm install
```

### Available Scripts
```bash
# Individual airport collection
npm run collect:sfo    # Collect SFO data
npm run collect:yyz    # Collect YYZ data

# Combined collection
npm run collect        # Collect all airport data

# Test mode (saves to test/ directory)
npm run test:sfo       # Test SFO collection
npm run test:yyz       # Test YYZ collection  
npm test               # Test all collections
```

### Development Notes
- **Local Storage**: Data saves to local `data/` directory (production mode) or `data/test/` (test mode)
- **No Authentication**: Local runs don't require GitHub tokens
- **Test Mode**: Files include `-test-timestamp` suffix for easy identification
- **Environment Detection**: Scripts automatically detect GitHub Actions vs local environment

## ⚙️ Architecture

### GitHub Actions Workflow
The automated workflow (`collect-flight-data.yml`) runs two separate jobs:

**YYZ Collection Job** (11:55 PM EST):
- Collects both departure and arrival data
- Runs on current day data
- Uses curl with proper headers for API access

**SFO Collection Job** (6:00 AM PST):  
- Collects comprehensive flight data
- Focuses on previous day data
- Handles pagination and rate limiting

### Project Structure
```
airport-flight-data-collector/
├── .github/
│   └── workflows/
│       └── collect-flight-data.yml    # GitHub Actions workflow
├── data/                              # Historical flight data
│   ├── sfo/                          # SFO flight files (300+ files)
│   └── yyz/                          # YYZ departure/arrival files
├── src/
│   ├── collect_sfo_data.js           # SFO data collection logic
│   ├── collect_yyz_data.js           # YYZ data collection logic  
│   └── utils.js                      # Shared utilities and GitHub API
├── test/
│   └── data/                         # Test data storage
├── package.json                      # Dependencies and scripts
├── LICENSE                           # MIT License
└── README.md                         # This documentation
```

### Core Components
- **Data Collectors**: Individual scripts for each airport's API
- **Utilities**: Shared functions for data fetching, storage, and GitHub integration
- **Error Handling**: Comprehensive logging and graceful failure recovery
- **Storage Engine**: Automatic detection between local and GitHub storage

## 🤝 Contributing

We welcome contributions! Here are ways you can help:

### Enhancement Ideas
- **New Airports**: Add support for additional airports (LAX, JFK, LHR, etc.)
- **Data Analysis**: Build analysis tools and visualizations
- **API Improvements**: Enhance error handling and retry logic
- **Documentation**: Improve guides and add examples
- **Testing**: Expand test coverage and CI/CD

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/airport-lax`)
3. Make your changes with proper logging and error handling
4. Test locally using `npm test`
5. Submit a pull request with clear description

### Code Standards
- Use Node.js 18+ features
- Follow existing code style and patterns
- Include comprehensive error handling
- Add logging for debugging
- Update documentation as needed

## 🛠️ Troubleshooting

### Common Issues

**GitHub Actions Failing**:
- Check that `PAT_GITHUB` secret is set correctly
- Verify token has `repo` scope permissions
- Review Actions logs for specific error messages

**Local Development Issues**:
- Ensure Node.js 18+ is installed (`node --version`)
- Run `npm install` to install all dependencies
- Check file permissions in project directory
- Verify internet connection for API access

**Data Collection Problems**:
- Airport APIs may change endpoints or formats
- Check if airport websites are accessible
- Review error logs for API response details
- Try manual workflow trigger to isolate issues

### Getting Help
- Open an issue with detailed error description
- Include relevant logs and steps to reproduce
- Specify your environment (local vs GitHub Actions)
- Check existing issues for similar problems

## 📈 Dataset Statistics

- **Total Files**: 500+ historical data files
- **Date Range**: August 2024 - Present (10+ months)
- **Data Points**: Millions of individual flight records
- **File Size**: ~50MB total compressed data
- **Update Frequency**: 2 collections daily (SFO + YYZ)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Related Projects

- Airport API documentation and schemas
- Flight data analysis tools
- Aviation industry datasets
- Real-time flight tracking applications