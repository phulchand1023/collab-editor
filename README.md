# Collaborative Text Editor

A production-grade real-time collaborative text editor deployed on Cloudflare's global edge network. Built with React, Cloudflare Workers, D1 database, and Yjs CRDT technology. Features include real-time synchronization, shared cursors, and role-based access control.

## 🌐 Live Demo

- **Frontend**: https://fe88e5ce.collab-text-editor-frontend.pages.dev
- **Backend API**: https://collab-text-editor-backend.phulchandkr7715.workers.dev
- **Health Check**: https://collab-text-editor-backend.phulchandkr7715.workers.dev/health

## 🚀 Features

- **Real-time Collaboration**: Multiple users can edit simultaneously with guaranteed convergence
- **CRDT Technology**: Conflict-free replicated data types using Yjs for seamless merging
- **Shared Cursors & Selections**: See other users' cursors and selections in real-time
- **Offline Support**: Queue edits locally and sync when reconnected
- **Role-based Access Control**: Owner/Editor/Viewer permissions with JWT authentication
- **Rich Text Editing**: Powered by TipTap with extensible editor features
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS
- **Horizontal Scaling**: Redis pub/sub for multi-instance deployment
- **Monitoring**: Prometheus metrics and structured logging

## 🏗️ Architecture

### Production (Cloudflare)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │  Database   │
│ (CF Pages)  │◄──►│(CF Workers) │◄──►│ (D1 SQLite) │
│             │    │             │    │             │
│ • React     │    │ • Hono      │    │ • Users     │
│ • TipTap    │    │ • Durable   │    │ • Documents │
│ • Tailwind  │    │   Objects   │    │ • Permissions│
└─────────────┘    └─────────────┘    └─────────────┘
```

### Local Development
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │  Database   │
│   (React)   │◄──►│  (Node.js)  │◄──►│  (MongoDB)  │
│             │    │             │    │             │
│ • TipTap    │    │ • Express   │    │ • Documents │
│ • Yjs CRDT  │    │ • Socket.io │    │ • Users     │
│ • Tailwind  │    │ • Yjs       │    │ • Operations│
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **TipTap** for rich text editing with collaboration extensions
- **Yjs** for CRDT-based conflict resolution
- **Tailwind CSS** for responsive styling
- **Socket.io Client** for WebSocket communication

### Backend
**Production (Cloudflare)**:
- **Cloudflare Workers** with Hono framework
- **Durable Objects** for WebSocket collaboration
- **D1 Database** (SQLite) for data persistence
- **JWT** for authentication
- **bcryptjs** for password hashing

**Development (Local)**:
- **Node.js 18+** with Express framework
- **Socket.io** for WebSocket server
- **MongoDB** with Mongoose for data persistence
- **JWT** for authentication
- **Pino** for structured logging

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB (for local development)
- Cloudflare account (for deployment)

### Local Development Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd collab-text-editor
```

2. **Install dependencies**:
```bash
npm run install:all
```

3. **Start MongoDB**:
```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

4. **Start development servers**:
```bash
npm run dev
```

5. **Access the application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Cloudflare Deployment

1. **Install Wrangler CLI**:
```bash
npm install -g wrangler
wrangler login
```

2. **Deploy Backend**:
```bash
cd backend
wrangler deploy
```

3. **Deploy Frontend**:
```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name collab-text-editor-frontend
```

## 🔧 Configuration

### Environment Variables

#### Local Development

**Backend (.env)**:
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/collab-editor
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env)**:
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

#### Production (Cloudflare)

**Backend (wrangler.toml)**:
```toml
[vars]
JWT_SECRET = "your-production-jwt-secret"
CORS_ORIGIN = "https://your-frontend.pages.dev"
```

**Frontend (.env)**:
```env
VITE_API_URL=https://your-backend.workers.dev
VITE_WS_URL=wss://your-backend.workers.dev
```

## 📡 API Documentation

### REST Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### Documents
- `GET /api/docs` - List user documents
- `POST /api/docs` - Create new document
- `GET /api/docs/:id/snapshot` - Get document snapshot
- `PUT /api/docs/:id/permissions` - Update document permissions
- `DELETE /api/docs/:id` - Delete document

#### System
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### WebSocket Events

#### Client → Server
- `join` - Join document room
- `yjs-update` - Send Yjs update
- `cursor` - Send cursor position

#### Server → Client
- `joined` - Document join confirmation
- `yjs-update` - Receive Yjs update
- `cursor` - Receive cursor update
- `presence` - User presence update
- `ack` - Operation acknowledgment
- `error` - Error message

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Backend only
npm run test:backend

# Frontend only
npm run test:frontend
```

### Test Coverage
- Unit tests for CRUD operations
- Integration tests for WebSocket communication
- Multi-client convergence tests
- Offline/reconnect scenarios
- ACL enforcement tests

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Metrics
Prometheus metrics available at `/metrics`:
- HTTP request duration
- WebSocket connections
- Yjs operations count
- Active documents

### Logging
Structured JSON logs with correlation IDs:
```json
{
  "level": "info",
  "time": "2024-01-01T00:00:00.000Z",
  "msg": "User joined document",
  "userId": "user123",
  "docId": "doc456"
}
```

## 🚀 Deployment

### Cloudflare Production

1. **Create D1 Database**:
```bash
wrangler d1 create collab-text-editor-db
wrangler d1 execute collab-text-editor-db --file=schema.sql --remote
```

2. **Deploy Backend**:
```bash
cd backend
wrangler deploy
```

3. **Deploy Frontend**:
```bash
cd frontend
npm run build
wrangler pages deploy dist
```

### Benefits of Cloudflare Deployment
- **Global Edge Network**: Sub-100ms latency worldwide
- **Auto-scaling**: Handles traffic spikes automatically
- **Zero Cold Starts**: Durable Objects for persistent connections
- **Built-in DDoS Protection**: Enterprise-grade security
- **Cost Effective**: Pay-per-request pricing model

## 🔒 Security

- JWT token authentication with expiration
- Role-based access control (Owner/Editor/Viewer)
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet.js security headers

## 🎯 Performance

- Optimistic local updates for low latency
- Efficient Yjs CRDT operations
- Redis pub/sub for horizontal scaling
- Connection pooling for MongoDB
- Gzip compression for API responses
- CDN-ready static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**WebSocket connection fails**:
- Check if backend is running on correct port
- Verify CORS configuration
- Check firewall settings

**Document not syncing**:
- Verify MongoDB connection
- Check Redis pub/sub configuration
- Review browser console for errors

**Authentication issues**:
- Verify JWT secret configuration
- Check token expiration settings
- Clear browser localStorage

### Debug Mode

**Local Development**:
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev:backend
```

**Cloudflare Workers**:
```bash
# View real-time logs
wrangler tail
```

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting guide