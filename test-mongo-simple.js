const { MongoClient } = require('mongodb');

// Use the same URI as in the docker-compose file
const mongoUri = 'mongodb://admin:P+ZhBfBiicEDXveA1FfqMk4QIl8XGgLidL8jesDDMuY=@mongodb:27017/tempmail_production?authSource=admin';

console.log('Connecting to MongoDB with URI:', mongoUri);

async function testConnection() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    const db = client.db('tempmail_production');
    console.log('Database name:', db.databaseName);
    
    // List collections to verify we can access the database
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();