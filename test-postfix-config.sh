#!/bin/bash

# Create a minimal Postfix configuration for testing
cat > /etc/postfix/main.cf << 'EOF'
# Minimal Postfix configuration for testing
myhostname = mail.nnu.edu.kg
mydomain = nnu.edu.kg
myorigin = $mydomain

# Network settings
inet_interfaces = loopback-only
inet_protocols = ipv4

# Disable local delivery
local_transport = error:local delivery is disabled

# Simple transport map
transport_maps = hash:/etc/postfix/transport

# Basic security
smtpd_banner = $myhostname ESMTP
disable_vrfy_command = yes
smtpd_helo_required = yes

# Logging
maillog_file = /var/log/postfix/postfix.log
EOF

# Create a simple transport file
cat > /etc/postfix/transport << 'EOF'
nnu.edu.kg      smtp:[backend]:2525
EOF

# Create the log directory
mkdir -p /var/log/postfix

# Generate the transport database
postmap /etc/postfix/transport

# Check the configuration
postfix check

# Try to start Postfix
postfix start-fg