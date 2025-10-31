import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { useAuth } from './useAuth.jsx';
import websocketService from '../services/websocket.jsx';

export const useCollaboration = (docId) => {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState(new Map());
  const [cursors, setCursors] = useState(new Map());
  
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const pendingUpdatesRef = useRef([]);

  useEffect(() => {
    if (!docId || !token) return;

    // Initialize Yjs document
    ydocRef.current = new Y.Doc();
    
    // Connect to WebSocket
    websocketService.connect(token);
    
    // Set up event handlers
    websocketService.on('connection', handleConnection);
    websocketService.on('joined', handleJoined);
    websocketService.on('yjs-update', handleYjsUpdate);
    websocketService.on('cursor', handleCursor);
    websocketService.on('presence', handlePresence);
    websocketService.on('ack', handleAck);
    websocketService.on('error', handleError);

    // Set up Yjs update handler
    ydocRef.current.on('update', handleLocalUpdate);

    // Join document
    websocketService.joinDocument(docId);

    return () => {
      // Cleanup
      websocketService.off('connection', handleConnection);
      websocketService.off('joined', handleJoined);
      websocketService.off('yjs-update', handleYjsUpdate);
      websocketService.off('cursor', handleCursor);
      websocketService.off('presence', handlePresence);
      websocketService.off('ack', handleAck);
      websocketService.off('error', handleError);
      
      if (ydocRef.current) {
        ydocRef.current.off('update', handleLocalUpdate);
        ydocRef.current.destroy();
      }
      
      websocketService.disconnect();
    };
  }, [docId, token]);

  const handleConnection = useCallback((isConnected) => {
    setConnected(isConnected);
    
    if (isConnected && pendingUpdatesRef.current.length > 0) {
      // Send pending updates
      pendingUpdatesRef.current.forEach(update => {
        websocketService.sendYjsUpdate(docId, update);
      });
      pendingUpdatesRef.current = [];
    }
  }, [docId]);

  const handleJoined = useCallback((data) => {
    console.log('Joined document:', data);
    
    if (data.update && ydocRef.current) {
      const update = new Uint8Array(data.update);
      Y.applyUpdate(ydocRef.current, update);
    }
  }, []);

  const handleYjsUpdate = useCallback((data) => {
    if (data.docId === docId && ydocRef.current) {
      const update = new Uint8Array(data.update);
      Y.applyUpdate(ydocRef.current, update);
    }
  }, [docId]);

  const handleLocalUpdate = useCallback((update, origin) => {
    // Don't send updates that came from remote
    if (origin === 'remote') return;
    
    if (connected) {
      websocketService.sendYjsUpdate(docId, update);
    } else {
      // Queue update for when we reconnect
      pendingUpdatesRef.current.push(update);
    }
  }, [docId, connected]);

  const handleCursor = useCallback((data) => {
    setCursors(prev => {
      const newCursors = new Map(prev);
      newCursors.set(data.userId, {
        userId: data.userId,
        name: data.name,
        color: data.color,
        selection: data.selection,
        viewport: data.viewport
      });
      return newCursors;
    });
  }, []);

  const handlePresence = useCallback((data) => {
    setPresence(prev => {
      const newPresence = new Map(prev);
      newPresence.set(data.userId, {
        userId: data.userId,
        name: data.name,
        color: data.color,
        status: data.status
      });
      return newPresence;
    });
  }, []);

  const handleAck = useCallback((data) => {
    console.log('Operation acknowledged:', data);
  }, []);

  const handleError = useCallback((error) => {
    console.error('WebSocket error:', error);
  }, []);

  const sendCursor = useCallback((selection, viewport) => {
    if (connected) {
      websocketService.sendCursor(docId, selection, viewport);
    }
  }, [docId, connected]);

  return {
    ydoc: ydocRef.current,
    connected,
    presence: Array.from(presence.values()),
    cursors: Array.from(cursors.values()),
    sendCursor
  };
};