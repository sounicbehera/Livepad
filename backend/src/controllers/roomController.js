import pool from '../db.js';

// Generate unique room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Create a new room
export const createRoom = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Room name is required' });
    }

    // Generate unique room code
    let roomCode;
    let codeExists = true;
    while (codeExists) {
      roomCode = generateRoomCode();
      const existing = await pool.query('SELECT id FROM rooms WHERE room_code = $1', [roomCode]);
      codeExists = existing.rows.length > 0;
    }

    // Create room
    const result = await pool.query(
      `INSERT INTO rooms (name, room_code, owner_id, description, is_public, content)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, room_code, owner_id, description, is_public, created_at`,
      [name, roomCode, userId, description || '', isPublic || false, '']
    );

    const room = result.rows[0];

    // Add owner as a member with 'owner' role
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [room.id, userId, 'owner']
    );

    console.log(`✅ Room created: ${room.name} (${room.room_code}) by user ${userId}`);

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        roomCode: room.room_code,
        ownerId: room.owner_id,
        description: room.description,
        isPublic: room.is_public,
        createdAt: room.created_at
      }
    });
  } catch (err) {
    console.error('❌ Create room error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all user's rooms
export const listRooms = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT r.id, r.name, r.room_code, r.owner_id, r.description, r.is_public, r.created_at,
              rm.role, COUNT(DISTINCT rm.user_id) as member_count
       FROM rooms r
       LEFT JOIN room_members rm ON r.id = rm.room_id
       WHERE r.id IN (
         SELECT room_id FROM room_members WHERE user_id = $1
       )
       GROUP BY r.id, rm.role
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const rooms = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      roomCode: row.room_code,
      ownerId: row.owner_id,
      description: row.description,
      isPublic: row.is_public,
      userRole: row.role,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      rooms
    });
  } catch (err) {
    console.error('❌ List rooms error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Join room by code
export const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;
    const userId = req.user.userId;

    if (!roomCode) {
      return res.status(400).json({ success: false, error: 'Room code is required' });
    }

    // Find room by code
    const roomResult = await pool.query(
      'SELECT id, name, is_public FROM rooms WHERE room_code = $1',
      [roomCode.toUpperCase()]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    // Check if user already in room
    const memberCheck = await pool.query(
      'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
      [room.id, userId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Already a member of this room' });
    }

    // Add user as member with 'editor' role by default
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [room.id, userId, 'editor']
    );

    console.log(`✅ User ${userId} joined room ${room.id}`);

    res.json({
      success: true,
      message: `Joined room "${room.name}"`,
      room: {
        id: room.id,
        name: room.name,
        roomCode: room.room_code
      }
    });
  } catch (err) {
    console.error('❌ Join room error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get room members
export const getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Check if user is member of room
    const memberCheck = await pool.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not a member of this room' });
    }

    // Get all members
    const result = await pool.query(
      `SELECT rm.id, rm.user_id, rm.role, rm.joined_at, u.name, u.email
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = $1
       ORDER BY rm.role DESC, rm.joined_at ASC`,
      [roomId]
    );

    const members = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      joinedAt: row.joined_at
    }));

    res.json({
      success: true,
      members
    });
  } catch (err) {
    console.error('❌ Get room members error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Invite member to room
export const inviteMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { email, role } = req.body;
    const userId = req.user.userId;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Check if requester is room owner
    const ownerCheck = await pool.query(
      `SELECT rm.role FROM room_members rm
       WHERE rm.room_id = $1 AND rm.user_id = $2`,
      [roomId, userId]
    );

    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Only room owner can invite members' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const invitedUserId = userResult.rows[0].id;

    // Check if already member
    const memberCheck = await pool.query(
      'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, invitedUserId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }

    // Add member
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [roomId, invitedUserId, role || 'editor']
    );

    console.log(`✅ User ${invitedUserId} invited to room ${roomId} as ${role || 'editor'}`);

    res.json({
      success: true,
      message: `${email} invited successfully as ${role || 'editor'}`
    });
  } catch (err) {
    console.error('❌ Invite member error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove member from room
export const removeMember = async (req, res) => {
  try {
    const { roomId, userId: memberUserId } = req.params;
    const userId = req.user.userId;

    // Check if requester is room owner
    const ownerCheck = await pool.query(
      `SELECT rm.role FROM room_members rm
       WHERE rm.room_id = $1 AND rm.user_id = $2`,
      [roomId, userId]
    );

    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Only room owner can remove members' });
    }

    // Can't remove room owner
    if (userId === memberUserId) {
      return res.status(400).json({ success: false, error: 'Cannot remove room owner' });
    }

    // Remove member
    const result = await pool.query(
      'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2 RETURNING id',
      [roomId, memberUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found in room' });
    }

    console.log(`✅ User ${memberUserId} removed from room ${roomId}`);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (err) {
    console.error('❌ Remove member error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get room details
export const getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Check if user is member
    const memberCheck = await pool.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not a member of this room' });
    }

    // Get room details
    const result = await pool.query(
      `SELECT id, name, room_code, owner_id, description, is_public, content, created_at
       FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const room = result.rows[0];

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        roomCode: room.room_code,
        ownerId: room.owner_id,
        description: room.description,
        isPublic: room.is_public,
        content: room.content,
        userRole: memberCheck.rows[0].role,
        createdAt: room.created_at
      }
    });
  } catch (err) {
    console.error('❌ Get room details error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};