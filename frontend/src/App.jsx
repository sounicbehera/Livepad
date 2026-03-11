import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

export default function App() {
  const [screen, setScreen] = useState('auth'); // auth, dashboard, editor
  const [user, setUser] = useState(null);
  const [content, setContent] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [createRoomData, setCreateRoomData] = useState({ name: '', description: '' });
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [roomMembers, setRoomMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const wsRef = useRef(null);

  // Load rooms when user logs in
  useEffect(() => {
    if (screen === 'dashboard' && user) {
      loadRooms();
    }
  }, [screen, user]);

  // Auth flow
  const handleLogin = async (email, name) => {
    setLoading(true);
    try {
      const sendRes = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!sendRes.ok) throw new Error('Failed to send OTP');

      // OTP sent successfully – stop loading so user can type
      setLoading(false);
      setPendingEmail(email);
      setPendingName(name);
      setShowOTPModal(true);
      setOtpValue('');
    } catch (err) {
      alert('Login failed: ' + err.message);
      setLoading(false);
    }
  };

  // Handle OTP submission
  const handleOTPSubmit = async () => {
    if (!otpValue.trim()) {
      alert('Please enter OTP');
      return;
    }

    try {
      // Now we're actually verifying – show loading state
      setLoading(true);
      const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp: otpValue, name: pendingName })
      });

      const data = await verifyRes.json();
      if (!data.success) throw new Error(data.error);

      localStorage.setItem('authToken', data.token);
      setUser(data.user);
      setScreen('dashboard');
      setShowOTPModal(false);
      setOtpValue('');
    } catch (err) {
      alert('OTP verification failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load rooms
  const loadRooms = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/rooms/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  // Create room
  const handleCreateRoom = async () => {
    if (!createRoomData.name.trim()) {
      alert('Room name is required');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createRoomData)
      });

      const data = await res.json();
      if (data.success) {
        alert(`Room created! Code: ${data.room.roomCode}`);
        setShowCreateRoomModal(false);
        setCreateRoomData({ name: '', description: '' });
        loadRooms();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to create room: ' + err.message);
    }
  };

  // Join room
  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      alert('Room code is required');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode: joinRoomCode })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowJoinRoomModal(false);
        setJoinRoomCode('');
        loadRooms();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to join room: ' + err.message);
    }
  };

  // Load room members
  const loadRoomMembers = async (rId) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/rooms/${rId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRoomMembers(data.members);
        setShowMembersModal(true);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  // Invite member
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      alert('Email is required');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail, role: 'editor' })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setInviteEmail('');
        loadRoomMembers(roomId);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to invite member: ' + err.message);
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!room?.id) return;
    if (room.userRole !== 'owner') {
      alert('Only the room owner can delete the room');
      return;
    }

    const confirmed = window.confirm(
      `Delete room "${room.name}" (${room.roomCode})?\n\nThis will remove all members and cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/rooms/${room.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Room deleted');
        loadRooms();
      } else {
        alert(data.error || 'Failed to delete room');
      }
    } catch (err) {
      alert('Failed to delete room: ' + err.message);
    }
  };

  // Connect to WebSocket
  const connectEditor = async (docId, docName) => {
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
      setRoomId(docId);
      setRoomName(docName);
      setScreen('editor');
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

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setContent('');
    setRooms([]);
    setScreen('auth');
    if (wsRef.current) wsRef.current.close();
  };

  const goBackToDashboard = () => {
    if (wsRef.current) wsRef.current.close();
    setIsConnected(false);
    setContent('');
    setScreen('dashboard');
  };

  return (
    <div className="app">
      {/* OTP Modal */}
      {showOTPModal && (
        <OTPModal
          email={pendingEmail}
          otp={otpValue}
          onOtpChange={setOtpValue}
          onSubmit={handleOTPSubmit}
          loading={loading}
        />
      )}

      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <Modal
          title="Create New Room"
          onClose={() => setShowCreateRoomModal(false)}
        >
          <div className="modal-form">
            <input
              type="text"
              placeholder="Room name"
              value={createRoomData.name}
              onChange={(e) => setCreateRoomData({ ...createRoomData, name: e.target.value })}
              className="modal-input"
            />
            <textarea
              placeholder="Description (optional)"
              value={createRoomData.description}
              onChange={(e) => setCreateRoomData({ ...createRoomData, description: e.target.value })}
              className="modal-input"
              rows="3"
            />
            <button onClick={handleCreateRoom} className="btn btn-primary modal-button">
              Create Room
            </button>
          </div>
        </Modal>
      )}

      {/* Join Room Modal */}
      {showJoinRoomModal && (
        <Modal
          title="Join Room"
          onClose={() => setShowJoinRoomModal(false)}
        >
          <div className="modal-form">
            <input
              type="text"
              placeholder="Enter room code"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
              className="modal-input"
              maxLength="10"
            />
            <button onClick={handleJoinRoom} className="btn btn-primary modal-button">
              Join Room
            </button>
          </div>
        </Modal>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <Modal
          title="Room Members & Invite"
          onClose={() => setShowMembersModal(false)}
        >
          <div className="members-modal">
            <div className="members-list">
              <h3>Current Members:</h3>
              {roomMembers.map((member) => (
                <div key={member.userId} className="member-item">
                  <div>
                    <p className="member-name">{member.name}</p>
                    <p className="member-email">{member.email}</p>
                  </div>
                  <span className="member-role">{member.role}</span>
                </div>
              ))}
            </div>

            <div className="invite-section">
              <h3>Invite Member:</h3>
              <input
                type="email"
                placeholder="Enter email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="modal-input"
              />
              <button onClick={handleInviteMember} className="btn btn-primary modal-button">
                Send Invite
              </button>
            </div>
          </div>
        </Modal>
      )}

      {screen === 'auth' ? (
        <AuthScreen onLogin={handleLogin} loading={loading} />
      ) : screen === 'dashboard' ? (
        <DashboardScreen
          user={user}
          rooms={rooms}
          onCreateRoom={() => setShowCreateRoomModal(true)}
          onJoinRoom={() => setShowJoinRoomModal(true)}
          onOpenRoom={(room) => connectEditor(room.id, room.name)}
          onLoadMembers={(roomId) => { setRoomId(roomId); loadRoomMembers(roomId); }}
          onDeleteRoom={handleDeleteRoom}
          onLogout={logout}
        />
      ) : (
        <EditorScreen
          user={user}
          roomName={roomName}
          content={content}
          onContentChange={handleDocumentChange}
          isConnected={isConnected}
          onBack={goBackToDashboard}
          onLogout={logout}
          onShowMembers={() => loadRoomMembers(roomId).then(() => setShowMembersModal(true))}
        />
      )}
    </div>
  );
}

function OTPModal({ email, otp, onOtpChange, onSubmit, loading }) {
  return (
    <div className="modal-overlay">
      <div className="otp-modal">
        <div className="otp-header">
          <h2>🔐 Enter OTP</h2>
          <p>We sent an OTP to <strong>{email}</strong></p>
        </div>

        <div className="otp-body">
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength="6"
            className="otp-input"
            autoFocus
            disabled={loading}
          />

          <button
            onClick={onSubmit}
            disabled={loading || otp.length < 6}
            className="btn btn-primary otp-submit"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <p className="otp-hint">💡 OTP expires in 5 minutes</p>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
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

function DashboardScreen({ user, rooms, onCreateRoom, onJoinRoom, onOpenRoom, onLoadMembers, onDeleteRoom, onLogout }) {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📚 My Rooms</h1>
        </div>
        <div className="header-right">
          <div className="user-badge">
            <span className="user-avatar">{user?.name?.[0]?.toUpperCase()}</span>
            <span className="user-name-small">{user?.name}</span>
          </div>
          <button onClick={onLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="action-buttons">
          <button onClick={onCreateRoom} className="btn btn-primary btn-large">
            ➕ Create Room
          </button>
          <button onClick={onJoinRoom} className="btn btn-secondary btn-large">
            🚪 Join Room
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Rooms Yet</h3>
            <p>Create a new room or join an existing one to get started!</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-header">
                  <h3>{room.name}</h3>
                  <span className="room-code">{room.roomCode}</span>
                </div>
                <p className="room-description">{room.description || 'No description'}</p>
                <div className="room-meta">
                  <span className="room-role">👤 {room.userRole}</span>
                  <span className="room-members">👥 {room.memberCount} members</span>
                </div>
                <div className="room-actions">
                  <button onClick={() => onOpenRoom(room)} className="btn btn-primary btn-sm">
                    Open
                  </button>
                  <button onClick={() => onLoadMembers(room.id)} className="btn btn-secondary btn-sm">
                    Members
                  </button>
                  {room.userRole === 'owner' && (
                    <button onClick={() => onDeleteRoom(room)} className="btn btn-danger btn-sm">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditorScreen({ user, roomName, content, onContentChange, isConnected, onBack, onLogout, onShowMembers }) {
  return (
    <div className="editor-container">
      <header className="editor-header">
        <div className="editor-header-left">
          <button onClick={onBack} className="btn-back">← Back</button>
          <h2>{roomName}</h2>
        </div>
        <div className="editor-header-right">
          <button onClick={onShowMembers} className="btn-icon">👥</button>
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <button onClick={onLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <div className="editor-stats">
        <span>{content.length} characters</span>
        <span>{content.split('\n').length} lines</span>
        <span>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
      </div>

      <textarea
        className="editor-textarea"
        value={content}
        onChange={onContentChange}
        placeholder="Start typing... Your changes are synced in real-time."
        spellCheck="true"
      />

      <footer className="editor-footer">
        <p>💡 Changes are saved automatically</p>
      </footer>
    </div>
  );
}