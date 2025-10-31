import { Server } from 'socket.io';
import logger from '../utils/logger.js';

class WebSocketService {
  initialize(server) {
    try {
      this.io = new Server(server, {
        cors: {
          origin: true,
          methods: ["GET", "POST"]
        }
      });

      this.io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        socket.on('join-document', (docId) => {
          socket.join(docId);
          socket.to(docId).emit('user-joined', {
            userId: socket.id,
            name: `User ${socket.id.slice(0, 4)}`
          });
        });

        socket.on('text-change', (data) => {
          socket.to(data.docId).emit('text-change', data);
        });

        socket.on('cursor-change', (data) => {
          socket.to(data.docId).emit('cursor-change', data);
        });

        socket.on('disconnect', () => {
          logger.info(`Socket disconnected: ${socket.id}`);
        });
      });

      logger.info('Socket.io server initialized');
    } catch (error) {
      logger.error('WebSocket initialization failed:', error);
    }
  }
}

export default new WebSocketService();