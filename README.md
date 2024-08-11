# Airport Flight Data Collector

This project uses a Cloudflare Worker to automatically collect daily flight data from multiple airports and store it in a GitHub repository.

## Features

- Collects flight data from San Francisco International Airport (SFO) and Toronto Pearson International Airport (YYZ)
- Runs daily at a scheduled time
- Stores data in a structured format in a GitHub repository
- Easily extensible to add more airports

## Quick Start

1. Clone the repository
2. Set up your environment variables (see [Environment Setup](docs/environment.md))
3. Install dependencies: `npm install`
4. Run tests: `npm test`
5. Deploy: `npm run deploy`

## Documentation

- [Environment Setup](docs/environment.md)
- [Testing](docs/testing.md)
- [Deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).