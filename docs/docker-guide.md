# Docker Guide

This guide covers how to run the Airport Flight Data Collector using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- At least 2GB of available RAM
- 1GB of free disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/airport-flight-data-collector.git
cd airport-flight-data-collector
```

### 2. Create Environment File

```bash
cp .env.example .env
# Edit .env with your database credentials if using cloud storage
```

### 3. Start All Services

```bash
docker-compose up -d
```

This will start:
- API server on http://localhost:3001
- Dashboard on http://localhost:3000
- Data collector (runs hourly)
- Redis for caching
- Prometheus for metrics
- Grafana for visualization on http://localhost:3003

### 4. Check Service Status

```bash
docker-compose ps
docker-compose logs -f
```

## Available Docker Images

The project provides multiple Docker images for different use cases:

### 1. API Server (`api`)
- Lightweight REST API server
- Exposes port 3001
- Includes health checks
- No browser dependencies

### 2. Dashboard (`dashboard`)
- React/Next.js web interface
- Exposes port 3000
- Served as static files
- Connects to API server

### 3. Data Collector (`collector`)
- Includes Chromium for Puppeteer
- Runs collection scripts
- Can be scheduled with cron
- Handles all airports

### 4. Full Stack (`fullstack`)
- Combined API + Dashboard
- Exposes ports 3000 and 3001
- Convenient for development
- Single container deployment

## Building Images

### Build Individual Images

```bash
# Build API server
docker build --target api -t flight-collector-api .

# Build dashboard
docker build --target dashboard -t flight-collector-dashboard .

# Build collector
docker build --target collector -t flight-collector .

# Build full stack
docker build --target fullstack -t flight-collector-full .
```

### Build with Docker Compose

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api
```

## Running Services

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d api dashboard

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Using Docker Run

```bash
# Run API server
docker run -d \
  --name flight-api \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  flight-collector-api

# Run collector once
docker run \
  --name flight-collector \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  flight-collector

# Run dashboard
docker run -d \
  --name flight-dashboard \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 \
  flight-collector-dashboard
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_TYPE=local  # or 'cloudflare', 'oracle'

# Cloudflare D1 (if using)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DATABASE_ID=your_database_id
CLOUDFLARE_D1_TOKEN=your_d1_token

# Oracle Cloud (if using)
OCI_DB_USER=your_db_user
OCI_DB_PASSWORD=your_db_password
OCI_DB_CONNECTION_STRING=your_connection_string

# Collection Settings
HTTP_CLIENT_TYPE=curl  # or 'fetch', 'puppeteer'
HTTP_TIMEOUT=30000
RETRY_ATTEMPTS=3
```

### Volumes

The following volumes are used:

- `./data:/app/data` - Collected flight data
- `./logs:/app/logs` - Application logs
- `redis_data` - Redis persistence
- `prometheus_data` - Metrics storage
- `grafana_data` - Dashboard configuration

### Networking

Services communicate through Docker's internal network:

- API: `http://api:3001`
- Dashboard: `http://dashboard:3000`
- Redis: `redis://redis:6379`
- Prometheus: `http://prometheus:9090`

## Monitoring

### Prometheus Metrics

Available at http://localhost:9090

Key metrics:
- `flight_collection_duration_seconds` - Collection time per airport
- `flight_collection_errors_total` - Error count by type
- `flight_data_records_total` - Total flights collected
- `api_request_duration_seconds` - API response times

### Grafana Dashboards

Access at http://localhost:3003 (admin/admin)

Pre-configured dashboards:
- Collection Performance
- API Performance
- System Health
- Error Analysis

### Health Checks

All services include health checks:

```bash
# Check API health
curl http://localhost:3001/api/v1/health

# Check all services
docker-compose ps
```

## Production Deployment

### Security Considerations

1. **Change default passwords**
   ```yaml
   environment:
     - GF_SECURITY_ADMIN_PASSWORD=strong_password_here
   ```

2. **Use secrets for sensitive data**
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Enable HTTPS with reverse proxy**
   ```nginx
   server {
     listen 443 ssl;
     ssl_certificate /etc/ssl/cert.pem;
     ssl_certificate_key /etc/ssl/key.pem;
     
     location / {
       proxy_pass http://dashboard:3000;
     }
   }
   ```

### Resource Limits

Set appropriate resource limits:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Scaling

For high availability:

```yaml
services:
  api:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

### Backup Strategy

1. **Data backup**
   ```bash
   # Backup collected data
   docker run --rm \
     -v flight-data:/data \
     -v $(pwd)/backups:/backup \
     alpine tar czf /backup/data-$(date +%Y%m%d).tar.gz /data
   ```

2. **Database backup**
   ```bash
   # For Cloudflare D1
   npm run db:export
   
   # For Oracle
   docker exec flight-api npm run db:backup
   ```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs
   docker-compose logs api
   
   # Verify environment
   docker-compose config
   ```

2. **Puppeteer errors in collector**
   ```bash
   # Ensure Chromium is installed
   docker exec collector which chromium-browser
   
   # Check permissions
   docker exec collector ls -la /usr/bin/chromium-browser
   ```

3. **Network connectivity**
   ```bash
   # Test internal network
   docker exec api ping redis
   
   # Check DNS
   docker exec api nslookup dashboard
   ```

4. **Volume permissions**
   ```bash
   # Fix ownership
   sudo chown -R 1000:1000 ./data ./logs
   ```

### Debug Mode

Enable debug logging:

```yaml
environment:
  - DEBUG=true
  - LOG_LEVEL=debug
```

### Container Shell Access

```bash
# Access running container
docker exec -it flight-api sh

# Run with shell for debugging
docker run -it --entrypoint sh flight-collector
```

## Advanced Usage

### Custom Scheduling

Use cron for custom collection schedules:

```bash
# Add to host crontab
0 */6 * * * docker run --rm -v /path/to/data:/app/data flight-collector
```

### Multi-Environment Setup

Use different compose files:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### CI/CD Integration

GitHub Actions example:

```yaml
- name: Build and push Docker image
  run: |
    docker build --target api -t ${{ secrets.REGISTRY }}/flight-api:${{ github.sha }} .
    docker push ${{ secrets.REGISTRY }}/flight-api:${{ github.sha }}
```

## Performance Optimization

### Image Size Reduction

- Multi-stage builds minimize final image size
- Alpine Linux base for smaller footprint
- Production dependencies only in runtime images

### Build Cache

Speed up builds with BuildKit:

```bash
DOCKER_BUILDKIT=1 docker build .
```

### Resource Usage

Monitor container resources:

```bash
docker stats
```

## Updates and Maintenance

### Updating Images

```bash
# Pull latest changes
git pull

# Rebuild images
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Log Rotation

Configure log rotation in docker-compose:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

### Cleanup

Remove unused resources:

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove all unused resources
docker system prune -a
```

## Support

For Docker-specific issues:
1. Check container logs: `docker-compose logs`
2. Verify environment: `docker-compose config`
3. Review Dockerfile stages
4. Check system resources: `docker system df`

For general issues, see the [Troubleshooting Guide](./troubleshooting.md).