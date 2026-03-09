import { useState, useEffect, useRef } from 'react';
import './App.css';

// Get API URLs from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

export default function App() {
  const [screen, setScreen] = useState('auth'); // auth, editor
  const [user, setUser] = useState(null);
  const [content, setContent] = useState('');
  const [users, setUsers] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  // Auth flow
  const handleLogin = async (email, name) => {
    setLoading(true);
    try {
      // Step 1: Send OTP
      const sendRes = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!sendRes.ok) throw new Error('Failed to send OTP');

      // Step 2: Prompt for OTP (in real app, email would be sent)
      const otp = prompt('Enter OTP sent to your email:');
      if (!otp) return;

      // Step 3: Verify OTP
      const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, name })
      });

      const data = await verifyRes.json();
      if (!data.success) throw new Error(data.error);

      localStorage.setItem('authToken', data.token);
      setUser(data.user);
      setScreen('editor');
    } catch (err) {
      alert('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Connect to WebSocket
  const connectEditor = async (docId) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const ws = new WebSocket(`${WS_URL}?token=${token}`);

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'join',
          roomId: docId
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init') {
          setContent(msg.content || '');
        } else if (msg.type === 'update') {
          setContent(msg.content);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setIsConnected(false);
      };
      
      ws.onclose = () => setIsConnected(false);

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  };

  const handleDocumentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit',
        roomId: roomId,
        content: newContent
      }));
    }
  };

  const startEditing = (docId) => {
    setRoomId(docId);
    connectEditor(docId);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setContent('');
    setScreen('auth');
    if (wsRef.current) wsRef.current.close();
  };

  return (
    <div className="app">
      {screen === 'auth' ? (
        <AuthScreen onLogin={handleLogin} loading={loading} />
      ) : (
        <EditorScreen
          user={user}
          content={content}
          onContentChange={handleDocumentChange}
          onStartEditing={startEditing}
          isConnected={isConnected}
          onLogout={logout}
          roomId={roomId}
        />
      )}
    </div>
  );
}

function AuthScreen({ onLogin, loading }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && name) onLogin(email, name);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>LivePad</h1>
          <p>Real-time Collaborative Editor</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Signing in...' : 'Sign In with OTP'}
          </button>
        </form>

        <div className="auth-footer">
          <p>🔐 Secure authentication with OTP</p>
        </div>
      </div>

      <div className="auth-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
    </div>
  );
}

function EditorScreen({ user, content, onContentChange, onStartEditing, isConnected, onLogout, roomId }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [customRoomId, setCustomRoomId] = useState('');

  const documents = [
    { id: 'doc1', name: 'Project Notes', icon: '📝' },
    { id: 'doc2', name: 'Meeting Minutes', icon: '📋' },
    { id: 'doc3', name: 'Code Review', icon: '💻' },
  ];

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc.id);
    onStartEditing(doc.id);
  };

  const handleCustomRoom = () => {
    if (customRoomId.trim()) {
      setSelectedDoc(customRoomId);
      onStartEditing(customRoomId);
    }
  };

  return (
    <div className="editor-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>LivePad</h2>
          <button className="btn-logout" onClick={onLogout} title="Logout">
            ↪️
          </button>
        </div>

        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="user-details">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
          </div>
        </div>

        <div className="documents-section">
          <h3>Documents</h3>
          <div className="documents-list">
            {documents.map((doc) => (
              <button
                key={doc.id}
                className={`doc-item ${selectedDoc === doc.id ? 'active' : ''}`}
                onClick={() => handleSelectDoc(doc)}
              >
                <span className="doc-icon">{doc.icon}</span>
                <span className="doc-name">{doc.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="custom-room">
          <h3>Custom Room</h3>
          <div className="custom-room-input">
            <input
              type="text"
              placeholder="Room ID"
              value={customRoomId}
              onChange={(e) => setCustomRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomRoom()}
            />
            <button onClick={handleCustomRoom} className="btn-small">→</button>
          </div>
        </div>

        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </aside>

      {/* Main Editor */}
      <main className="editor-main">
        {selectedDoc ? (
          <div className="editor-content">
            <div className="editor-header">
              <h2>Editing: {roomId}</h2>
              <div className="editor-stats">
                <span>{content.length} characters</span>
                <span>{content.split('\n').length} lines</span>
              </div>
            </div>

            <textarea
              className="editor-textarea"
              value={content}
              onChange={onContentChange}
              placeholder="Start typing... Your changes are synced in real-time."
              spellCheck="true"
            />

            <div className="editor-footer">
              <p>💡 Changes are saved automatically</p>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No document selected</h3>
            <p>Choose a document from the sidebar to start editing</p>
          </div>
        )}
      </main>
    </div>
  );
}