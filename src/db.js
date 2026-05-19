const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

let client;
let db;

async function connect() {
  if (db) return db;

  const uri = process.env.MONGO_URI;
  const databaseName = process.env.DATABASE_NAME;

  if (!uri || !databaseName) {
    throw new Error('MONGO_URI and DATABASE_NAME must be set in environment variables');
  }

  client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();

  db = client.db(databaseName);
  return db;
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connect,
  close,
};
