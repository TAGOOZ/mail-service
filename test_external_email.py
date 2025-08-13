#!/usr/bin/env python3
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

def send_external_email():
    """
    This simulates sending an email from an external service (like Gmail)
    by sending it directly to MailHog, which will capture it for testing.
    """
    # MailHog SMTP configuration (simulating external email)
    smtp_server = "127.0.0.1"
    smtp_port = 1025  # MailHog SMTP port
    
    # Simulate external email details
    sender_email = "external.user@gmail.com"
    recipient_email = "6d40f1571izg@nnu.edu.kg"
    subject = "🌐 External Email Test - Simulating Gmail"
    body = """
    Hello from the outside world! 🌍
    
    This email simulates what would happen if someone sent an email 
    from Gmail, Yahoo, or another external provider to your temporary mailbox.
    
    In a real-world scenario with proper DNS configuration, this is how 
    external emails would be delivered to your mail service.
    
    Best regards,
    External Email System
    """
    
    # Create message
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = subject
    
    # Add body to email
    message.attach(MIMEText(body, "plain"))
    
    try:
        print(f"🌐 Simulating external email via MailHog {smtp_server}:{smtp_port}")
        
        # Create SMTP session
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            print("✅ Connected to MailHog successfully!")
            
            # Send email
            text = message.as_string()
            server.sendmail(sender_email, recipient_email, text)
            print(f"📧 External email simulation sent to {recipient_email}")
            print("🔍 Check MailHog UI at http://localhost:8025 to see the captured email!")
            
    except socket.error as e:
        print(f"❌ Connection error: {e}")
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    send_external_email()
