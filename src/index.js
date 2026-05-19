const express = require('express');
const dotenv = require('dotenv');
const { connect } = require('./db');
const {
  buildSlug,
  normalizeAuthor,
  createAuthorObject,
  summaryForRevision,
  generateSeedDocuments,
} = require('./utils');

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

async function initializeDb(db) {
  const collection = db.collection('documents');
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex({ title: 'text', content: 'text' });

  const count = await collection.estimatedDocumentCount();
  if (count === 0) {
    const docs = generateSeedDocuments(1200);
    await collection.insertMany(docs);
    console.log(`Seeded ${docs.length} documents into documents collection.`);
  }
}

function transformDocumentForResponse(document) {
  if (!document) return null;
  return {
    ...document,
    metadata: {
      ...document.metadata,
      author: normalizeAuthor(document.metadata?.author),
    },
  };
}

app.post('/api/documents', async (req, res) => {
  try {
    const { title, content, tags, authorName, authorEmail } = req.body;

    if (!title || !content || !Array.isArray(tags) || !authorName || !authorEmail) {
      return res.status(400).json({ error: 'title, content, tags, authorName, and authorEmail are required' });
    }

    const slug = buildSlug(title);
    const createdAt = new Date();
    const author = createAuthorObject(authorName, authorEmail);

    const newDoc = {
      slug,
      title,
      content,
      version: 1,
      tags,
      metadata: {
        author,
        createdAt,
        updatedAt: createdAt,
        wordCount: content.split(/\s+/).length,
      },
      revision_history: [],
    };

    const db = await connect();
    const collection = db.collection('documents');
    await collection.insertOne(newDoc);

    return res.status(201).json(newDoc);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A document with this slug already exists' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Unable to create document' });
  }
});

app.get('/api/documents/:slug', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('documents');
    const document = await collection.findOne({ slug: req.params.slug });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json(transformDocumentForResponse(document));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to fetch document' });
  }
});

app.put('/api/documents/:slug', async (req, res) => {
  try {
    const { title, content, tags, version } = req.body;
    if (!title || !content || typeof version !== 'number') {
      return res.status(400).json({ error: 'title, content, and version are required' });
    }

    const db = await connect();
    const collection = db.collection('documents');
    const original = await collection.findOne({ slug: req.params.slug });

    if (!original) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (original.version !== version) {
      return res.status(409).json(transformDocumentForResponse(original));
    }

    const resolvedTags = Array.isArray(tags) ? tags : original.tags;
    const updatedAt = new Date();
    const nextVersion = original.version + 1;
    const updatedRevision = {
      version: nextVersion,
      updatedAt,
      authorId: original.metadata?.author?.id ?? null,
      contentDiff: summaryForRevision(original, { title, content, tags: resolvedTags }),
    };

    const updateResult = await collection.findOneAndUpdate(
      { slug: req.params.slug, version },
      {
        $set: {
          title,
          content,
          tags: resolvedTags,
          'metadata.updatedAt': updatedAt,
          'metadata.wordCount': content.split(/\s+/).length,
        },
        $inc: { version: 1 },
        $push: {
          revision_history: {
            $each: [updatedRevision],
            $slice: -20,
          },
        },
      },
      { returnDocument: 'after' }
    );

    if (!updateResult.value) {
      const latest = await collection.findOne({ slug: req.params.slug });
      return res.status(409).json(transformDocumentForResponse(latest));
    }

    return res.status(200).json(transformDocumentForResponse(updateResult.value));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to update document' });
  }
});

app.delete('/api/documents/:slug', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('documents');
    const result = await collection.deleteOne({ slug: req.params.slug });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to delete document' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, tags } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const db = await connect();
    const collection = db.collection('documents');
    const filter = { $text: { $search: q } };

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      if (tagArray.length > 0) {
        filter.tags = { $all: tagArray };
      }
    }

    const cursor = collection
      .find(filter, {
        projection: {
          slug: 1,
          title: 1,
          content: 1,
          tags: 1,
          metadata: 1,
          version: 1,
          revision_history: 1,
          score: { $meta: 'textScore' },
        },
      })
      .sort({ score: { $meta: 'textScore' } });

    const results = await cursor.toArray();
    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/analytics/most-edited', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('documents');
    const pipeline = [
      {
        $project: {
          slug: 1,
          title: 1,
          editCount: { $size: { $ifNull: ['$revision_history', []] } },
        },
      },
      { $sort: { editCount: -1 } },
      { $limit: 10 },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to fetch analytics' });
  }
});

app.get('/api/analytics/tag-cooccurrence', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('documents');
    const pairPipeline = [
      { $match: { tags: { $exists: true, $ne: [] } } },
      { $project: { tags: 1 } },
      { $unwind: '$tags' },
      { $group: { _id: '$slug', tags: { $addToSet: '$tags' } } },
      { $project: { tags: 1 } },
      { $unwind: '$tags' },
      { $addFields: { tagA: '$tags' } },
      { $project: { tags: 1, tagA: 1 } },
      { $unwind: '$tags' },
      { $project: { tagA: 1, tagB: '$tags' } },
      { $match: { $expr: { $lt: ['$tagA', '$tagB'] } } },
      {
        $group: {
          _id: { tagA: '$tagA', tagB: '$tagB' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          tags: ['$_id.tagA', '$_id.tagB'],
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ];

    const results = await collection.aggregate(pairPipeline).toArray();
    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to calculate tag co-occurrence' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

async function start() {
  try {
    const db = await connect();
    await initializeDb(db);
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
