#!/usr/bin/env python3
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

def send_test_email():
    # Email configuration
    smtp_server = "127.0.0.1"
    smtp_port = 2525
    
    # Test email details
    sender_email = "test@example.com"
    recipient_email = "6d40f1571izg@nnu.edu.kg"
    subject = "MailHog Test Email"
    body = "This is a test email to verify MailHog integration is working! 📧✨"
    
    # Create message
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = subject
    
    # Add body to email
    message.attach(MIMEText(body, "plain"))
    
    try:
        print(f"Connecting to SMTP server {smtp_server}:{smtp_port}")
        
        # Create SMTP session
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            print("Connected successfully!")
            
            # Send email
            text = message.as_string()
            server.sendmail(sender_email, recipient_email, text)
            print(f"Email sent successfully to {recipient_email}")
            
    except socket.error as e:
        print(f"Connection error: {e}")
    except smtplib.SMTPException as e:
        print(f"SMTP error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    send_test_email()
