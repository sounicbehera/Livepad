# Livepad
Real-time collaborative document editor with WebSocket-based synchronization and persistent storage.

# LivePad – Real-time Collaborative Editor

## Overview
A real-time collaborative document editor built using modern web technologies.

## Key Features
- Real-time text synchronization
- Multi-user collaboration
- Persistent document storage

## Tech Stack
- Frontend: React
- Backend: Node.js
- Realtime: WebSockets
- Database: PostgreSQL

## Design Decisions
- Backend memory is used as the source of truth for live document state.
- PostgreSQL is used for persistence and crash recovery.
- REST APIs are used for state initialization, WebSockets for real-time synchronization.

## System Architecture
<img width="726" height="608" alt="Untitled-2026-01-22-1843" src="https://github.com/user-attachments/assets/87c93e8d-36d9-4e13-8d61-49b472db8645" />


## Status
🚧 In Progress
