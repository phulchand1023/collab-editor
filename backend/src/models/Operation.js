import mongoose from 'mongoose';

const operationSchema = new mongoose.Schema({
  docId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  opId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  update: {
    type: Buffer,
    required: true
  },
  meta: {
    lamport: Number,
    vectorClock: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

operationSchema.index({ docId: 1, createdAt: 1 });
operationSchema.index({ opId: 1 }, { unique: true });
operationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL

export default mongoose.model('Operation', operationSchema);