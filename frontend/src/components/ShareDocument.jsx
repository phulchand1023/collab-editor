import React, { useState } from 'react';
import { documentsAPI } from '../services/api.jsx';
import Alert from './Alert.jsx';

const ShareDocument = ({ document, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!email.trim()) {
      setAlert({ type: 'warning', message: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    try {
      await documentsAPI.share(document._id, { email, role });
      setAlert({ type: 'success', message: 'Document shared successfully!' });
      setEmail('');
      setTimeout(() => {
        setAlert(null);
        onClose();
      }, 2000);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to share document';
      setAlert({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = `${window.location.origin}/document/${document._id}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Share Document</h3>
        
        {alert && (
          <Alert 
            type={alert.type} 
            message={alert.message} 
            onClose={() => setAlert(null)}
          />
        )}

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Share Link</label>
            <div className="flex">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="input-field flex-1 text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="ml-2 btn-secondary text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Add User by Email</label>
            <input
              type="email"
              placeholder="Enter registered user's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
            />
            <p className="text-xs text-gray-500 mt-1">User must already be registered to be added</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field w-full"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleShare}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDocument;