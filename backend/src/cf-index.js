import { Hono } from 'hono';
import { cors } from 'hono/cors';
// Simple UUID generator for Cloudflare Workers
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = new Hono();

app.use('*', cors({
  origin: ['https://443b5a9d.collab-text-editor-frontend.pages.dev', 'https://61434aa9.collab-text-editor-frontend.pages.dev', 'https://fe88e5ce.collab-text-editor-frontend.pages.dev', 'https://c5756309.collab-text-editor-frontend.pages.dev', 'https://e6b7cf9e.collab-text-editor-frontend.pages.dev', 'https://ac5df79d.collab-text-editor-frontend.pages.dev', 'https://cd3d9044.collab-text-editor-frontend.pages.dev', 'https://deac5780.collab-text-editor-frontend.pages.dev', 'https://collab-text-editor-frontend.pages.dev', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Database helper functions
const createUser = async (db, { id, name, email, passwordHash }) => {
  await db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
    .bind(id, name, email, passwordHash).run();
};

const getUserByEmail = async (db, email) => {
  return await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
};

const createDocument = async (db, doc) => {
  await db.prepare('INSERT INTO documents (id, title, content, owner_id, version) VALUES (?, ?, ?, ?, ?)')
    .bind(doc.id, doc.title, doc.content, doc.owner_id, doc.version).run();
  await db.prepare('INSERT INTO document_permissions (document_id, user_id, role) VALUES (?, ?, ?)')
    .bind(doc.id, doc.owner_id, 'owner').run();
};

const getUserDocuments = async (db, userId) => {
  const docs = await db.prepare(`
    SELECT d.* FROM documents d 
    JOIN document_permissions dp ON d.id = dp.document_id 
    WHERE dp.user_id = ?
  `).bind(userId).all();
  
  return docs.results?.map(doc => ({
    _id: doc.id,
    title: doc.title,
    content: doc.content,
    ownerId: { _id: doc.owner_id, name: 'User' },
    createdAt: doc.created_at || new Date().toISOString(),
    updatedAt: doc.updated_at || new Date().toISOString(),
    version: doc.version || 0,
    acl: [{ userId: { _id: doc.owner_id, name: 'User' }, role: 'owner' }]
  })) || [];
};

const shareDocument = async (db, docId, userId, role) => {
  await db.prepare('INSERT OR REPLACE INTO document_permissions (document_id, user_id, role) VALUES (?, ?, ?)')
    .bind(docId, userId, role).run();
};

// Auth middleware
const authenticate = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }
  
  try {
    const decoded = jwt.verify(token, c.env.JWT_SECRET);
    c.set('user', { _id: decoded.userId, name: decoded.name });
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// Auth routes
app.post('/api/auth/register', async (c) => {
  const { name, email, password } = await c.req.json();
  
  const existingUser = await getUserByEmail(c.env.DB, email);
  if (existingUser) {
    return c.json({ error: 'User already exists' }, 400);
  }
  
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  
  await createUser(c.env.DB, { id: userId, name, email, passwordHash });
  
  const token = jwt.sign({ userId, name }, c.env.JWT_SECRET, { expiresIn: '7d' });
  
  return c.json({ 
    token, 
    user: { _id: userId, name, email }
  });
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  
  const user = await getUserByEmail(c.env.DB, email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  const token = jwt.sign({ userId: user.id, name: user.name }, c.env.JWT_SECRET, { expiresIn: '7d' });
  
  return c.json({ 
    token, 
    user: { _id: user.id, name: user.name, email: user.email }
  });
});

app.get('/api/auth/me', authenticate, (c) => {
  return c.json({ user: c.get('user') });
});

// Document routes
app.get('/api/docs', authenticate, async (c) => {
  const userDocs = await getUserDocuments(c.env.DB, c.get('user')._id);
  return c.json({ documents: userDocs });
});

app.post('/api/docs', authenticate, async (c) => {
  const { title } = await c.req.json();
  const user = c.get('user');
  
  const document = {
    id: uuidv4(),
    title,
    content: '',
    owner_id: user._id,
    version: 0
  };
  
  await createDocument(c.env.DB, document);
  
  return c.json({ document: { _id: document.id, ...document } });
});

app.post('/api/docs/:id/share', authenticate, async (c) => {
  const { email, role } = await c.req.json();
  const docId = c.req.param('id');
  
  const targetUser = await getUserByEmail(c.env.DB, email);
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  await shareDocument(c.env.DB, docId, targetUser.id, role);
  
  return c.json({ message: 'Document shared successfully' });
});

// WebSocket for collaboration (Durable Objects)
export class DocumentRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();
    this.sessions.add(server);

    server.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      // Broadcast to all other sessions
      this.sessions.forEach(session => {
        if (session !== server && session.readyState === WebSocket.READY_STATE_OPEN) {
          session.send(JSON.stringify(data));
        }
      });
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}

app.get('/api/docs/:id/collaborate', async (c) => {
  const docId = c.req.param('id');
  const id = c.env.DOCUMENT_ROOM.idFromName(docId);
  const room = c.env.DOCUMENT_ROOM.get(id);
  return room.fetch(c.req.raw);
});

app.get('/', (c) => {
  return c.json({ 
    message: 'Collaborative Text Editor API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      docs: '/api/docs/*'
    }
  });
});

app.get('/favicon.ico', (c) => {
  return new Response(null, { status: 204 });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;