const rooms = new Map();

export function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      content: "",
      clients: new Set(),
    });
  }
  return rooms.get(roomId);
}

export function removeClient(roomId, ws) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.clients.delete(ws);

  if (room.clients.size === 0) {
    rooms.delete(roomId);
  }
}