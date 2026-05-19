function slugify(text) {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSlug(title) {
  const base = slugify(title);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

function normalizeAuthor(author) {
  if (typeof author === 'string') {
    return {
      id: null,
      name: author,
      email: null,
    };
  }

  return {
    id: author?.id ?? null,
    name: author?.name ?? null,
    email: author?.email ?? null,
  };
}

function createAuthorObject(name, email) {
  return {
    id: `user-${slugify(name) || Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
  };
}

function summaryForRevision(oldDoc, newDoc) {
  const changes = [];
  if (oldDoc.title !== newDoc.title) changes.push('title');
  if (oldDoc.content !== newDoc.content) changes.push('content');
  if (JSON.stringify(oldDoc.tags) !== JSON.stringify(newDoc.tags)) changes.push('tags');
  if (changes.length === 0) return 'Updated document.';
  return `Edited ${changes.join(' and ')}.`;
}

function generateSeedDocuments(count = 1200) {
  const titles = [
    'MongoDB Guide',
    'Collaborative Editing Best Practices',
    'Wiki Document Patterns',
    'Optimistic Concurrency Control',
    'Schema Evolution Strategies',
    'Full Text Search Design',
    'Analytics Pipeline Examples',
    'Revision History Model',
    'Content Management API',
    'Distributed Collaboration'
  ];

  const tagPool = ['mongodb', 'guide', 'api-design', 'collaboration', 'search', 'analytics', 'schema', 'versioning', 'distributed', 'devops'];
  const documents = [];

  for (let i = 1; i <= count; i += 1) {
    const title = `${titles[i % titles.length]} ${i}`;
    const slug = `${slugify(title)}-${i}`;
    const tags = [tagPool[i % tagPool.length], tagPool[(i + 1) % tagPool.length]];

    if (i % 5 === 0) {
      tags.push(tagPool[(i + 3) % tagPool.length]);
    }

    const content = `# ${title}\n\nThis is the content for ${title}. It explains core concepts of collaborative editing, schema migration, and MongoDB usage. Document number ${i} is part of the seeded collection.`;
    const updatedAt = new Date(Date.now() - (count - i) * 1000 * 60);
    const createdAt = new Date(updatedAt.getTime() - 1000 * 60 * 60);
    const authorName = `Author ${((i - 1) % 20) + 1}`;
    const author = i % 10 === 0 ? authorName : createAuthorObject(authorName, `author${((i - 1) % 20) + 1}@example.com`);
    const revisionCount = Math.floor(Math.random() * 4);
    const revision_history = [];

    for (let revision = 1; revision <= revisionCount; revision += 1) {
      revision_history.push({
        version: revision,
        updatedAt: new Date(createdAt.getTime() + revision * 1000 * 60 * 10),
        authorId: `user-${((revision - 1) % 20) + 1}`,
        contentDiff: `Revision ${revision} snapshot summary.`,
      });
    }

    documents.push({
      slug,
      title,
      content,
      version: revisionCount + 1,
      tags,
      metadata: {
        author,
        createdAt,
        updatedAt,
        wordCount: content.split(/\s+/).length,
      },
      revision_history,
    });
  }

  return documents;
}

module.exports = {
  slugify,
  buildSlug,
  normalizeAuthor,
  createAuthorObject,
  summaryForRevision,
  generateSeedDocuments,
};
