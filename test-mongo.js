const mongoose = require('mongoose');

// Use the same URI as in the docker-compose file
const mongoUri = 'mongodb://admin:P+ZhBfBiicEDXveA1FfqMk4QIl8XGgLidL8jesDDMuY=@mongodb:27017/tempmail_production?authSource=admin';

console.log('Connecting to MongoDB with URI:', mongoUri);

mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
}).then(() => {
  console.log('MongoDB connected successfully');
  return mongoose.connection.close();
}).then(() => {
  console.log('Connection closed');
  process.exit(0);
}).catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});