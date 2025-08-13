// MongoDB initialization script
db = db.getSiblingDB('tempmail_production');

// Create collections
db.createCollection('mailboxes');
db.createCollection('emails');

// Create indexes for better performance
db.mailboxes.createIndex({ "email": 1 }, { unique: true });
db.mailboxes.createIndex({ "createdAt": 1 });
db.emails.createIndex({ "to": 1 });
db.emails.createIndex({ "createdAt": 1 });

print('Database initialized successfully');
