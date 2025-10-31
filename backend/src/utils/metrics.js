import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const websocketConnections = new client.Gauge({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections'
});

const yjsOperations = new client.Counter({
  name: 'yjs_operations_total',
  help: 'Total number of Yjs operations processed',
  labelNames: ['document_id']
});

const documentsActive = new client.Gauge({
  name: 'documents_active_total',
  help: 'Total number of active documents'
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(websocketConnections);
register.registerMetric(yjsOperations);
register.registerMetric(documentsActive);

export {
  register,
  httpRequestDuration,
  websocketConnections,
  yjsOperations,
  documentsActive
};