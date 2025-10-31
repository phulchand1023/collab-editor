import { createClient } from 'redis';
import logger from '../utils/logger.js';

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.subscribers = new Map();
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL
      });

      this.subscriber = this.client.duplicate();
      this.publisher = this.client.duplicate();

      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      logger.info('Connected to Redis');
    } catch (error) {
      logger.warn('Redis not available, running in single-instance mode');
      // Continue without Redis for single-instance deployment
    }
  }

  async publish(channel, data) {
    if (!this.publisher) return;
    
    try {
      await this.publisher.publish(channel, JSON.stringify(data));
    } catch (error) {
      logger.error('Redis publish error:', error);
    }
  }

  async subscribe(channel, callback) {
    if (!this.subscriber) return;

    try {
      this.subscribers.set(channel, callback);
      
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          logger.error('Redis message parse error:', error);
        }
      });
    } catch (error) {
      logger.error('Redis subscribe error:', error);
    }
  }

  async disconnect() {
    if (this.client) await this.client.disconnect();
    if (this.subscriber) await this.subscriber.disconnect();
    if (this.publisher) await this.publisher.disconnect();
  }
}

export default new RedisService();