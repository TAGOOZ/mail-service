# TempMail Production Deployment Guide

This guide provides comprehensive instructions for deploying TempMail to a production environment.

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or newer (recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB minimum, SSD recommended
- **Network**: Static IP address with domain name configured

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- Nginx (if not using containerized version)
- SSL certificates (Let's Encrypt recommended)

## Initial Server Setup

### 1. Create System User

```bash
# Create dedicated user for TempMail
sudo useradd -m -s /bin/bash tempmail
sudo usermod -aG docker tempmail

# Create application directory
sudo mkdir -p /opt/tempmail
sudo chown tempmail:tempmail /opt/tempmail
```

### 2. Clone Repository

```bash
sudo -u tempmail git clone https://github.com/your-repo/tempmail.git /opt/tempmail
cd /opt/tempmail
```

### 3. Configure Environment

```bash
# Copy and configure production environment
cp .env.production .env.production.local
nano .env.production.local
```

**Important**: Update the following values in `.env.production.local`:

- `MONGODB_ROOT_PASSWORD`: Strong password for MongoDB
- `REDIS_PASSWORD`: Strong password for Redis
- `JWT_SECRET`: Long, secure secret key (64+ characters)
- `SESSION_SECRET`: Another long, secure secret key
- All other passwords and secrets

## SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Obtain SSL certificate
sudo certbot certonly --standalone -d mail.nnu.edu.kg

# Certificates will be saved to /etc/letsencrypt/live/mail.nnu.edu.kg/
```

### Copy Certificates to Application

```bash
sudo mkdir -p /opt/tempmail/config/nginx/ssl
sudo cp /etc/letsencrypt/live/mail.nnu.edu.kg/fullchain.pem /opt/tempmail/config/nginx/ssl/
sudo cp /etc/letsencrypt/live/mail.nnu.edu.kg/privkey.pem /opt/tempmail/config/nginx/ssl/
sudo chown -R tempmail:tempmail /opt/tempmail/config/nginx/ssl
```

## Deployment

### 1. Run Deployment Script

```bash
cd /opt/tempmail
sudo -u tempmail ./scripts/deploy-production.sh
```

The deployment script will:

- Check prerequisites
- Create necessary directories
- Backup existing data (if any)
- Build and start all services
- Wait for services to become healthy
- Setup monitoring

### 2. Verify Deployment

```bash
# Check service status
./scripts/deploy-production.sh status

# Run health check
./scripts/health-check.sh

# View logs
./scripts/deploy-production.sh logs
```

### 3. Setup Systemd Service (Optional)

```bash
# Copy service file
sudo cp config/systemd/tempmail.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable tempmail.service
sudo systemctl start tempmail.service

# Check status
sudo systemctl status tempmail.service
```

## Post-Deployment Configuration

### 1. Setup Monitoring

The deployment script automatically sets up basic monitoring with cron jobs:

```bash
# View current cron jobs
crontab -l

# Monitor logs
tail -f /opt/tempmail/logs/monitor.log
tail -f /opt/tempmail/logs/health.log
```

### 2. Setup Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/tempmail << EOF
/opt/tempmail/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 tempmail tempmail
    postrotate
        docker-compose -f /opt/tempmail/docker-compose.prod.yml restart nginx
    endscript
}
EOF
```

### 3. Setup Automated Backups

```bash
# Add backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/tempmail/scripts/backup.sh") | crontab -

# Test backup
./scripts/backup.sh
```

### 4. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (adjust port as needed)
sudo ufw allow 22/tcp

# Allow SMTP (for receiving emails)
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp

# Enable firewall
sudo ufw enable
```

## DNS Configuration

Configure your DNS records:

```
A     mail.nnu.edu.kg    -> YOUR_SERVER_IP
MX    nnu.edu.kg         -> mail.nnu.edu.kg (priority 10)
TXT   nnu.edu.kg         -> "v=spf1 a mx ~all"
```

## Maintenance

### Daily Operations

```bash
# Check system health
./scripts/health-check.sh

# View service status
./scripts/deploy-production.sh status

# View recent logs
./scripts/deploy-production.sh logs --tail 100
```

### Updates

```bash
# Pull latest code
git pull origin main

# Redeploy
./scripts/deploy-production.sh
```

### Backup and Restore

```bash
# Create backup
./scripts/backup.sh

# List backups
./scripts/backup.sh list

# Restore (manual process)
./scripts/backup.sh restore /opt/tempmail/backups/backup_YYYYMMDD_HHMMSS
```

### Scaling

To handle more traffic, you can scale services:

```bash
# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale frontend instances
docker-compose -f docker-compose.prod.yml up -d --scale frontend=2
```

## Troubleshooting

### Common Issues

1. **Services not starting**

   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs

   # Check disk space
   df -h

   # Check memory
   free -h
   ```

2. **Database connection issues**

   ```bash
   # Check MongoDB
   docker exec tempmail-mongodb-prod mongosh --eval "db.adminCommand('ping')"

   # Check Redis
   docker exec tempmail-redis-prod redis-cli ping
   ```

3. **SSL certificate issues**

   ```bash
   # Renew certificates
   sudo certbot renew

   # Copy new certificates
   sudo cp /etc/letsencrypt/live/mail.nnu.edu.kg/* /opt/tempmail/config/nginx/ssl/

   # Restart nginx
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

### Performance Tuning

1. **Database Optimization**
   - Monitor MongoDB slow queries
   - Add appropriate indexes
   - Configure proper connection pooling

2. **Redis Optimization**
   - Monitor memory usage
   - Configure appropriate eviction policies
   - Set up Redis clustering if needed

3. **Nginx Optimization**
   - Enable HTTP/2
   - Configure proper caching headers
   - Use CDN for static assets

## Security Considerations

1. **Regular Updates**
   - Keep Docker images updated
   - Apply security patches to host OS
   - Update SSL certificates before expiry

2. **Access Control**
   - Use strong passwords for all services
   - Limit SSH access
   - Configure fail2ban for brute force protection

3. **Monitoring**
   - Monitor for suspicious activities
   - Set up alerts for service failures
   - Regular security audits

## Support

For issues and questions:

- Check logs: `/opt/tempmail/logs/`
- Run health check: `./scripts/health-check.sh`
- Review monitoring: `./scripts/monitor.sh`

## License

This deployment configuration is part of the TempMail project and follows the same license terms.
