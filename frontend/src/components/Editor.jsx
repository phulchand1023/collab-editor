import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useAuth } from '../hooks/useAuth.jsx';
import ShareDocument from './ShareDocument.jsx';

const Editor = ({ docId, document }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [showShare, setShowShare] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: true,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
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
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Editing: {document?.title || 'Untitled Document'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowShare(true)}
            className="btn-primary text-sm"
          >
            Share
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {user?.name}
          </span>
        </div>
      </div>

      {/* Editor */}
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

// Generate consistent color for user
function getUserColor(userId) {
  if (!userId) return '#6b7280';
  
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];
  
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

export default Editor;