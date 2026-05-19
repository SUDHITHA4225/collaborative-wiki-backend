const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config();

async function migrate() {
  const uri = process.env.MONGO_URI;
  const databaseName = process.env.DATABASE_NAME;

  if (!uri || !databaseName) {
    throw new Error('MONGO_URI and DATABASE_NAME must be defined in environment variables');
  }

  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(databaseName);
  const collection = db.collection('documents');

  const filter = { 'metadata.author': { $type: 'string' } };
  const batchSize = 1000;
  let processed = 0;

  console.log('Starting author schema migration...');

  while (true) {
    const docs = await collection
      .find(filter)
      .limit(batchSize)
      .project({ _id: 1, 'metadata.author': 1 })
      .toArray();

    if (docs.length === 0) {
      break;
    }

    const operations = docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            'metadata.author': {
              id: null,
              name: doc.metadata.author,
              email: null,
            },
          },
        },
      },
    }));

    if (operations.length > 0) {
      const bulkResult = await collection.bulkWrite(operations);
      processed += bulkResult.modifiedCount || operations.length;
      console.log(`Migrated ${processed} documents so far...`);
    }
  }

  console.log(`Migration complete. Total migrated: ${processed}`);
  await client.close();
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
