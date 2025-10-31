import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth.jsx';
import ShareDocument from './ShareDocument.jsx';

const CollaborativeEditor = ({ docId, document }) => {
  const { user } = useAuth();
  const [showShare, setShowShare] = useState(false);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  
  const socketRef = useRef(null);
  const isLocalChange = useRef(false);

  useEffect(() => {
    if (!docId || !user) return;

    // Connect to Socket.io
    socketRef.current = io('http://localhost:3001');
    
    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join-document', docId);
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('user-joined', (userData) => {
      setUsers(prev => [...prev, userData]);
    });

    socketRef.current.on('text-change', (data) => {
      if (editor && !isLocalChange.current) {
        editor.commands.setContent(data.content, false);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [docId, user]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      if (socketRef.current && connected) {
        isLocalChange.current = true;
        socketRef.current.emit('text-change', {
          docId,
          content: editor.getHTML(),
          userId: user._id
        });
        setTimeout(() => {
          isLocalChange.current = false;
        }, 100);
      }
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {connected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {users.length + 1} online
          </span>
          
          <button
            onClick={() => setShowShare(true)}
            className="btn-primary text-sm"
          >
            Share
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        <EditorContent 
          editor={editor} 
          className="h-full prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none prose-gray dark:prose-invert"
        />
      </div>
      
      {showShare && (
        <ShareDocument 
          document={document}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
};

export default CollaborativeEditor;