# 🚀 Production Deployment Guide for External Email Reception

## 📋 Prerequisites

### 1. **Domain & DNS Requirements**
- Own a domain (e.g., `yourdomain.com`)
- DNS control (Cloudflare, Route53, etc.)
- Subdomain for mail service (e.g., `tempmail.yourdomain.com`)

### 2. **Server Requirements**
- Public VPS/Cloud server (DigitalOcean, AWS, etc.)
- Static public IP address
- Ubuntu 20.04+ or similar
- At least 2GB RAM, 2 CPU cores
- Ports 25, 80, 443, 587 accessible

### 3. **Security Requirements**
- SSL certificates (Let's Encrypt)
- Firewall configuration
- Email security protocols

## 🔧 Step-by-Step Production Setup

### Phase 1: Server Preparation

#### 1.1 Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx ufw git

# Configure firewall
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 25    # SMTP
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 587   # SMTP Submission
sudo ufw allow 8080  # Application (optional)
```

#### 1.2 Domain Configuration
Set up these DNS records for your domain:

```dns
# Main application
A    tempmail.yourdomain.com    → YOUR_SERVER_IP

# Mail exchange records
MX   yourdomain.com             → mail.yourdomain.com (priority: 10)
A    mail.yourdomain.com        → YOUR_SERVER_IP

# Optional: subdomain for mail service
MX   tempmail.yourdomain.com    → mail.yourdomain.com (priority: 10)

# Security records (add later)
TXT  yourdomain.com             → "v=spf1 a mx ~all"
TXT  _dmarc.yourdomain.com      → "v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com"
```

### Phase 2: Application Deployment

#### 2.1 Clone and Configure
```bash
# Clone your repository
git clone https://github.com/TAGOOZ/mail-service.git
cd mail-service

# Create production environment file
cp .env.example .env.production
```

#### 2.2 Production Environment Configuration
```bash
# Edit the production environment
nano .env.production
```

### Phase 3: SSL Certificate Setup

#### 3.1 Get SSL Certificates
```bash
# Install certificates for your domains
sudo certbot --nginx -d tempmail.yourdomain.com -d mail.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Phase 4: Mail Server Configuration

#### 4.1 Postfix Production Setup
The application includes Postfix configuration that needs these adjustments:

#### 4.2 DNS Verification
```bash
# Test DNS configuration
dig MX yourdomain.com
dig A mail.yourdomain.com
nslookup YOUR_SERVER_IP  # Should return your domain
```

## 📧 Email Security Configuration

### SPF Record
```dns
TXT  yourdomain.com  "v=spf1 a mx ip4:YOUR_SERVER_IP ~all"
```

### DKIM Setup (Optional but Recommended)
```bash
# Generate DKIM keys
sudo mkdir -p /etc/postfix/dkim
sudo openssl genrsa -out /etc/postfix/dkim/mail.private 1024
sudo openssl rsa -in /etc/postfix/dkim/mail.private -out /etc/postfix/dkim/mail.public -pubout
```

### DMARC Record
```dns
TXT  _dmarc.yourdomain.com  "v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com"
```

## 🚀 Production Deployment Commands

### Deploy the Application
```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Nginx Production Configuration
The application will need an updated nginx configuration for SSL and proper domain handling.

## 🧪 Testing External Email Reception

Once deployed, test with:

### 1. **DNS/MX Record Test**
```bash
# Test MX records
dig MX yourdomain.com

# Test mail server connectivity
telnet mail.yourdomain.com 25
```

### 2. **External Email Test**
Send email from Gmail to: `[generated-address]@yourdomain.com`

### 3. **Mail Server Test**
```bash
# Test SMTP connectivity
echo "Test message" | mail -s "Test Subject" test@yourdomain.com
```

## 📊 Monitoring & Maintenance

### Log Monitoring
```bash
# Check mail logs
docker-compose -f docker-compose.prod.yml logs mailserver
docker-compose -f docker-compose.prod.yml logs backend

# System mail logs
sudo tail -f /var/log/mail.log
```

### Health Checks
```bash
# Application health
curl https://tempmail.yourdomain.com/api/health

# Mail server health
curl https://tempmail.yourdomain.com/health/mail
```

## 🔒 Security Considerations

1. **Firewall**: Only expose necessary ports
2. **SSL**: Use strong certificates and protocols
3. **Updates**: Regular security updates
4. **Monitoring**: Set up monitoring for failures
5. **Backup**: Regular database backups
6. **Rate Limiting**: Prevent abuse
7. **Email Security**: SPF, DKIM, DMARC

## 💰 Estimated Costs

- **Domain**: $10-15/year
- **VPS Server**: $5-20/month (DigitalOcean, Linode, etc.)
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$10-25/month

## 🚨 Important Notes

1. **Port 25**: Many cloud providers block port 25 by default
2. **IP Reputation**: New server IPs may be blacklisted initially
3. **Reverse DNS**: Set up rDNS for your server IP
4. **Email Limits**: Implement rate limiting to prevent spam
5. **Legal Compliance**: Follow local laws regarding email services

## 📞 Support and Resources

- [Postfix Documentation](http://www.postfix.org/documentation.html)
- [Let's Encrypt Guide](https://letsencrypt.org/getting-started/)
- [Email Deliverability Guide](https://www.mailgun.com/email-deliverability/)
- [MX Toolbox](https://mxtoolbox.com/) - Testing email configuration

---

Would you like me to help you implement any specific part of this setup?
