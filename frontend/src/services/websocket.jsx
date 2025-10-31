import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.eventHandlers = new Map();
  }

  connect(token) {
    // Force new build - updated backend URL
    const WS_URL = import.meta.env.VITE_WS_URL || 'https://collab-text-editor-backend.phulchandkr7715.workers.dev';
    
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.emit('connection', true);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.emit('connection', false);
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('connection', false);
      this.attemptReconnect();
    });

    // Forward all events to handlers
    ['joined', 'yjs-update', 'cursor', 'presence', 'ack', 'error'].forEach(event => {
      this.socket.on(event, (data) => this.emit(event, data));
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        if (this.socket) {
          this.socket.connect();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(event, data) {
    if (this.connected && this.socket) {
      this.socket.emit(event, data);
    } else {
      this.messageQueue.push({ event, data });
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift();
      this.socket.emit(event, data);
    }
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Document-specific methods
  joinDocument(docId) {
    this.send('join', { docId });
  }

  sendYjsUpdate(docId, update) {
    this.send('yjs-update', { docId, update: Array.from(update) });
  }

  sendCursor(docId, selection, viewport) {
    this.send('cursor', { docId, selection, viewport });
  }

  isConnected() {
    return this.connected;
  }
}

export default new WebSocketService();