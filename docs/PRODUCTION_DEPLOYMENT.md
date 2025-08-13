# Production Deployment Guide

## Prerequisites

1. Docker and Docker Compose installed
2. A valid SSL certificate for your domain (for HTTPS)
3. Proper DNS configuration pointing to your server

## Setup Instructions

1. Copy `.env.example` to `.env.production` and modify the values as needed:
   ```bash
   cp .env.example .env.production
   ```

2. Modify the `.env.production` file with your specific configuration:
   - Update domain names
   - Change passwords
   - Adjust resource limits if needed

3. Create SSL certificates:
   - Place your SSL certificate at `config/nginx/ssl/mail.nnu.edu.kg.crt`
   - Place your SSL private key at `config/nginx/ssl/mail.nnu.edu.kg.key`

4. Create required directories:
   ```bash
   sudo mkdir -p /opt/tempmail/data/mongodb
   sudo mkdir -p /opt/tempmail/data/redis
   sudo mkdir -p /opt/tempmail/data/mailserver
   sudo mkdir -p logs/nginx
   sudo mkdir -p logs/postfix
   ```

5. Set proper permissions:
   ```bash
   sudo chown -R $(id -u):$(id -g) /opt/tempmail
   ```

## Starting the Production Environment

Use one of the following methods:

### Method 1: Using the provided scripts (recommended)
```bash
# Start all services
./scripts/start-production.sh

# Stop all services
./scripts/stop-production.sh

# Restart all services
./scripts/restart-production.sh
```

### Method 2: Using docker-compose directly
```bash
# Start all services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Stop all services
docker-compose -f docker-compose.prod.yml --env-file .env.production down
```

## Monitoring Services

To check the status of running services:
```bash
docker ps
```

To view logs for a specific service:
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f <service_name>
```

Where `<service_name>` can be:
- `mongodb`
- `redis`
- `backend`
- `frontend`
- `mailserver`
- `nginx`

## Updating the Application

To update the application to the latest version:
1. Pull the latest code from the repository
2. Rebuild the Docker images:
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production build
   ```
3. Restart the services:
   ```bash
   ./scripts/restart-production.sh
   ```

Watchtower is also configured to automatically update containers, but you can disable this in the `.env.production` file if needed.

## Troubleshooting

If services fail to start:
1. Check the logs: `docker-compose -f docker-compose.prod.yml --env-file .env.production logs`
2. Ensure all required directories exist and have proper permissions
3. Verify that all environment variables are correctly set in `.env.production`
4. Check that SSL certificates are in the correct location