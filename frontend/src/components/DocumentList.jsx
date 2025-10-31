import React, { useState, useEffect } from 'react';
import { documentsAPI } from '../services/api.jsx';
import Alert from './Alert.jsx';

const DocumentList = ({ onSelectDocument, onCreateDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.list();
      setDocuments(response.data.documents);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      setAlert({ type: 'warning', message: 'Please enter a document title' });
      return;
    }

    try {
      const response = await documentsAPI.create({ title: newDocTitle });
      const newDoc = response.data.document;
      setDocuments(prev => [newDoc, ...prev]);
      setNewDocTitle('');
      setShowCreateForm(false);
      setAlert({ type: 'success', message: 'Document created successfully!' });
      setTimeout(() => onCreateDocument?.(newDoc), 1000);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to create document' });
      console.error('Error creating document:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button 
          onClick={loadDocuments}
          className="mt-2 btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Documents
        </h2>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
        >
          + New Document
        </button>
      </div>

      {/* Alert */}
      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.message} 
          onClose={() => setAlert(null)}
        />
      )}

      {/* Create Document Form */}
      {showCreateForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Document</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter document title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              className="input-field flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
              autoFocus
            />
            <button onClick={handleCreateDocument} className="btn-primary">
              Create
            </button>
            <button 
              onClick={() => {
                setShowCreateForm(false);
                setNewDocTitle('');
              }} 
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No documents yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first document to get started with collaborative editing.
          </p>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            Create Document
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc._id}
              onClick={() => onSelectDocument(doc)}
              className="card p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {doc.title}
                </h3>
                <div className="flex items-center space-x-1">
                  {doc.acl.slice(0, 3).map((acl, index) => (
                    <div
                      key={acl.userId._id}
                      className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium"
                      title={`${acl.userId.name} (${acl.role})`}
                    >
                      {acl.userId.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {doc.acl.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                      +{doc.acl.length - 3}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Owner: {doc.ownerId.name}</p>
                <p>Updated: {formatDate(doc.updatedAt)}</p>
                <p>Version: {doc.version}</p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  doc.acl.find(acl => acl.role === 'owner') ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                  doc.acl.find(acl => acl.role === 'editor') ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                }`}>
                  {doc.acl.find(acl => acl.userId._id)?.role || 'viewer'}
                </span>
                
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentList;