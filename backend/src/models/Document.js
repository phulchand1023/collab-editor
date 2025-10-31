import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  latestSnapshot: {
    type: Buffer,
    default: null
  },
  version: {
    type: Number,
    default: 0
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acl: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      required: true
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

documentSchema.index({ ownerId: 1 });
documentSchema.index({ 'acl.userId': 1 });
documentSchema.index({ isDeleted: 1 });

documentSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  const roleHierarchy = { viewer: 1, editor: 2, owner: 3 };
  const userAcl = this.acl.find(acl => acl.userId.toString() === userId.toString());
  
  if (!userAcl) return false;
  
  return roleHierarchy[userAcl.role] >= roleHierarchy[requiredRole];
};

export default mongoose.model('Document', documentSchema);