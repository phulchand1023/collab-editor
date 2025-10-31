import * as Y from 'yjs';
import { createHash } from 'crypto';
import Operation from '../models/Operation.js';
import Document from '../models/Document.js';
import logger from '../utils/logger.js';

class YjsService {
  constructor() {
    this.docs = new Map(); // docId -> Y.Doc
  }

  getDoc(docId) {
    if (!this.docs.has(docId)) {
      const doc = new Y.Doc();
      this.docs.set(docId, doc);
      this.loadDocument(docId, doc);
    }
    return this.docs.get(docId);
  }

  async loadDocument(docId, doc) {
    try {
      const document = await Document.findById(docId);
      if (document?.latestSnapshot) {
        Y.applyUpdate(doc, document.latestSnapshot);
      }

      // Apply any operations since last snapshot
      const operations = await Operation.find({ docId })
        .sort({ createdAt: 1 });

      for (const op of operations) {
        Y.applyUpdate(doc, op.update);
      }

      logger.info(`Loaded document ${docId} with ${operations.length} operations`);
    } catch (error) {
      logger.error(`Failed to load document ${docId}:`, error);
    }
  }

  async applyUpdate(docId, update, userId) {
    const opId = this.generateOpId(update);
    
    try {
      // Check for duplicate
      const existing = await Operation.findOne({ opId });
      if (existing) {
        logger.debug(`Duplicate operation ${opId} ignored`);
        return { success: true, duplicate: true };
      }

      // Apply to in-memory doc
      const doc = this.getDoc(docId);
      Y.applyUpdate(doc, update);

      // Persist operation
      const operation = new Operation({
        docId,
        opId,
        userId,
        update: Buffer.from(update),
        meta: {
          lamport: Date.now()
        }
      });

      await operation.save();
      logger.debug(`Applied operation ${opId} to document ${docId}`);

      return { success: true, opId };
    } catch (error) {
      logger.error(`Failed to apply update to ${docId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async createSnapshot(docId) {
    try {
      const doc = this.getDoc(docId);
      const snapshot = Y.encodeStateAsUpdate(doc);

      await Document.findByIdAndUpdate(docId, {
        latestSnapshot: Buffer.from(snapshot),
        version: Date.now(),
        updatedAt: new Date()
      });

      logger.info(`Created snapshot for document ${docId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create snapshot for ${docId}:`, error);
      return false;
    }
  }

  generateOpId(update) {
    return createHash('sha256').update(update).digest('hex');
  }

  getStateVector(docId) {
    const doc = this.getDoc(docId);
    return Y.encodeStateVector(doc);
  }

  getDiff(docId, stateVector) {
    const doc = this.getDoc(docId);
    return Y.encodeStateAsUpdate(doc, stateVector);
  }
}

export default new YjsService();