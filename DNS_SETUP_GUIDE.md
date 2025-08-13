# 📡 DNS Configuration Guide for TempMail Production

## Required DNS Records

Replace `yourdomain.com` with your actual domain and `YOUR_SERVER_IP` with your server's public IP address.

### Basic Records

```dns
# Main application
A    tempmail.yourdomain.com    YOUR_SERVER_IP

# Mail server  
A    mail.yourdomain.com        YOUR_SERVER_IP

# Mail exchange records (this is what makes external email work!)
MX   yourdomain.com             mail.yourdomain.com (priority: 10)
MX   tempmail.yourdomain.com    mail.yourdomain.com (priority: 10)
```

### Security Records (Highly Recommended)

```dns
# SPF Record - Prevents email spoofing
TXT  yourdomain.com             "v=spf1 a mx ip4:YOUR_SERVER_IP ~all"

# DMARC Record - Email authentication policy  
TXT  _dmarc.yourdomain.com      "v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com"

# Reverse DNS (rDNS) - Contact your hosting provider
PTR  YOUR_SERVER_IP             mail.yourdomain.com
```

## DNS Provider Examples

### Cloudflare
1. Go to DNS settings in Cloudflare dashboard
2. Add the records above
3. Set proxy status to "DNS only" (gray cloud) for mail records

### DigitalOcean
1. Go to Networking → Domains in DO dashboard  
2. Add your domain
3. Create the DNS records as shown above

### AWS Route 53
1. Create hosted zone for your domain
2. Add the DNS records
3. Update your domain's nameservers to Route 53

### Namecheap/GoDaddy
1. Go to domain management
2. Find "DNS Management" or "Advanced DNS"
3. Add the records as A, MX, and TXT records

## Verification Commands

After setting up DNS, verify with these commands:

```bash
# Check A records
dig A tempmail.yourdomain.com
dig A mail.yourdomain.com

# Check MX records (this is crucial for email!)
dig MX yourdomain.com
dig MX tempmail.yourdomain.com

# Check SPF record
dig TXT yourdomain.com

# Check DMARC record  
dig TXT _dmarc.yourdomain.com

# Test reverse DNS
dig -x YOUR_SERVER_IP
```

## What Each Record Does

- **A Records**: Points domain names to your server's IP address
- **MX Records**: Tells other email servers where to deliver emails for your domain
- **SPF Record**: Prevents other servers from sending email pretending to be from your domain
- **DMARC Record**: Sets policy for handling emails that fail authentication
- **rDNS Record**: Maps your IP back to your domain name (reduces spam score)

## 🚨 Critical for Gmail Delivery

The **MX record** is what allows Gmail and other providers to find your mail server. Without it:
- ❌ Gmail will return "550 5.1.1 Address does not exist" 
- ❌ No external emails will be delivered
- ❌ Your temporary email service won't receive real emails

With proper MX records:
- ✅ Gmail can find your mail server
- ✅ External emails are delivered
- ✅ Your temp mail service receives real emails from anywhere

## DNS Propagation

DNS changes take time to propagate globally:
- **Local**: 5-10 minutes
- **Global**: 24-48 hours (usually much faster)

Use [whatsmydns.net](https://whatsmydns.net) to check propagation status.

## Testing Email Delivery

Once DNS is configured and propagated:

1. **Generate a temp mailbox** at https://tempmail.yourdomain.com
2. **Send a test email** from Gmail to the generated address
3. **Check if it arrives** in your app interface

If emails don't arrive, check:
- MX records are correctly set
- Server ports 25/587 are open
- Mail service is running (`docker-compose logs mailserver`)
- No firewall blocking SMTP traffic

## Common Issues

**"Address does not exist" from Gmail:**
- Missing or incorrect MX records
- DNS not propagated yet
- Server not accessible on port 25

**Emails go to spam:**
- Missing SPF/DMARC records
- No reverse DNS configured
- New server IP with poor reputation

**Connection refused:**
- Firewall blocking port 25
- Mail service not running
- Server behind NAT without port forwarding
