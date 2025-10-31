import express from 'express';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import emailService from '../services/email.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const documents = await Document.find({
      $or: [
        { ownerId: req.user._id },
        { 'acl.userId': req.user._id }
      ],
      isDeleted: false
    })
    .populate('ownerId', 'name email')
    .populate('acl.userId', 'name email')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, initialContent, permissions = [] } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const acl = [
      { userId: req.user._id, role: 'owner' },
      ...permissions.map(p => ({ userId: p.userId, role: p.role }))
    ];

    const document = new Document({
      title,
      ownerId: req.user._id,
      acl
    });

    await document.save();
    await document.populate('ownerId', 'name email');
    await document.populate('acl.userId', 'name email');

    res.status(201).json({ document });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/snapshot', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document || document.isDeleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.hasAccess(req.user._id, 'viewer')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      document: {
        _id: document._id,
        title: document.title,
        version: document.version,
        updatedAt: document.updatedAt
      },
      snapshot: document.latestSnapshot
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/permissions', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document || document.isDeleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.hasAccess(req.user._id, 'owner')) {
      return res.status(403).json({ error: 'Only owners can modify permissions' });
    }

    const existingAcl = document.acl.find(acl => acl.userId.toString() === userId);
    if (existingAcl) {
      existingAcl.role = role;
    } else {
      document.acl.push({ userId, role });
    }

    await document.save();
    res.json({ document });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const { email, role } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document || document.isDeleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.hasAccess(req.user._id, 'owner')) {
      return res.status(403).json({ error: 'Only owners can share documents' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingAcl = document.acl.find(acl => acl.userId.toString() === user._id.toString());
    if (existingAcl) {
      return res.status(400).json({ error: 'User already has access' });
    }

    document.acl.push({ userId: user._id, role });
    await document.save();

    // Send email notification
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/document/${document._id}`;
    const emailSent = await emailService.sendShareNotification(
      user.email, 
      document.title, 
      req.user.name, 
      shareUrl
    );

    res.json({ 
      message: emailSent ? 'Document shared and email sent!' : 'Document shared (email failed)', 
      user: { name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document || document.isDeleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.hasAccess(req.user._id, 'owner')) {
      return res.status(403).json({ error: 'Only owners can delete documents' });
    }

    document.isDeleted = true;
    await document.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;