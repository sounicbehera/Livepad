import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  createRoom,
  listRooms,
  joinRoom,
  getRoomMembers,
  inviteMember,
  removeMember,
  getRoomDetails
} from '../controllers/roomController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create a new room
router.post('/create', createRoom);

// List all user's rooms
router.get('/list', listRooms);

// Get room details
router.get('/:roomId/details', getRoomDetails);

// Join room by code
router.post('/join', joinRoom);

// Get room members
router.get('/:roomId/members', getRoomMembers);

// Invite member to room
router.post('/:roomId/invite', inviteMember);

// Remove member from room
router.delete('/:roomId/members/:userId', removeMember);

export default router;