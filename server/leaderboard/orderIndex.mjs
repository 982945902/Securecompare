const VALID_DIRECTIONS = new Set(['less', 'equal', 'greater']);

export class EncryptedOrderIndex {
  constructor({ compareEncryptedEntries }) {
    if (typeof compareEncryptedEntries !== 'function') {
      throw new Error('compare-adapter-required');
    }
    this.compareEncryptedEntries = compareEncryptedEntries;
    this.buckets = [];
    this.entriesById = new Map();
  }

  async insert(entry) {
    validateEntry(entry);
    if (this.entriesById.has(entry.entryId)) {
      throw new Error('duplicate-entry');
    }

    if (this.buckets.length === 0) {
      this.buckets.push(createBucket(entry));
      this.entriesById.set(entry.entryId, this.buckets[0]);
      return { bucketId: entry.entryId, inserted: true };
    }

    let low = 0;
    let high = this.buckets.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const comparison = await this.compareEncryptedEntries(entry, this.buckets[mid].representative);
      assertComparison(comparison);

      if (comparison === 'equal') {
        this.buckets[mid].entryIds.push(entry.entryId);
        this.buckets[mid].entries.push(entry);
        this.buckets[mid].count += 1;
        this.entriesById.set(entry.entryId, this.buckets[mid]);
        return { bucketId: this.buckets[mid].bucketId, inserted: false };
      }
      if (comparison === 'less') {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    this.buckets.splice(low, 0, createBucket(entry));
    this.entriesById.set(entry.entryId, this.buckets[low]);
    return { bucketId: entry.entryId, inserted: true };
  }

  listBuckets() {
    return this.buckets.map((bucket) => ({
      bucketId: bucket.bucketId,
      representative: bucket.representative,
      count: bucket.count,
      entryIds: [...bucket.entryIds],
      entries: [...bucket.entries],
    }));
  }

  rankRangeForEntry(entryId) {
    const targetBucket = this.entriesById.get(entryId);
    if (!targetBucket) {
      return null;
    }

    let start = 1;
    for (const bucket of this.buckets) {
      const end = start + bucket.count - 1;
      if (bucket === targetBucket) {
        return { start, end };
      }
      start = end + 1;
    }
    return null;
  }
}

function createBucket(entry) {
  return {
    bucketId: entry.entryId,
    representative: entry,
    count: 1,
    entryIds: [entry.entryId],
    entries: [entry],
  };
}

function validateEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('invalid-entry');
  }
  for (const field of ['schemaId', 'entryId', 'ciphertext', 'token']) {
    if (typeof entry[field] !== 'string' || entry[field].length === 0) {
      throw new Error(`missing-${field}`);
    }
  }
}

function assertComparison(comparison) {
  if (!VALID_DIRECTIONS.has(comparison)) {
    throw new Error('invalid-compare-result');
  }
}
