import { WebSocketServer, WebSocket } from "ws";
import {
  getDocument,
  createDocument,
  updateDocument
} from "./documentService.js";

const activeDocs = new Map(); // in-memory cache

export const initWebSocketServer = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    let currentDocId = null;

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw);
        const { type, docId, content } = data;

        // ======================
        // JOIN DOCUMENT
        // ======================
        if (type === "join") {
          currentDocId = docId;

          let doc = await getDocument(docId);

          if (!doc) {
            await createDocument(docId, "");
            doc = { id: docId, content: "" };
          }

          // Initialize cache if not exists
          if (!activeDocs.has(docId)) {
            activeDocs.set(docId, {
              content: doc.content,
              clients: new Set()
            });
          }

          const room = activeDocs.get(docId);
          room.clients.add(ws);

          console.log(`Client joined doc: ${docId}`);

          ws.send(JSON.stringify({
            type: "init",
            content: room.content
          }));
        }

        // ======================
        // EDIT DOCUMENT
        // ======================

        const saveTimers = new Map();

function scheduleSave(docId, content) {
  if (saveTimers.has(docId)) {
    clearTimeout(saveTimers.get(docId));
  }

  const timer = setTimeout(async () => {
    await updateDocument(docId, content);
    saveTimers.delete(docId);
    console.log("Saved to DB:", docId);
  }, 500);

  saveTimers.set(docId, timer);
}

        if (type === "edit") {
          if (!currentDocId) return;

          const room = activeDocs.get(currentDocId);
          if (!room) return;

          room.content = content;

          // Save to DB
          scheduleSave(currentDocId, content);
          // Broadcast to other clients
          room.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "update",
                content
              }));
            }
          });
        }

      } catch (err) {
        console.error("WebSocket error:", err);
      }
    });

    if (type === "cursor") {
  const room = activeDocs.get(currentDocId);
  if (!room) return;

  room.clients.forEach(client => {
    if (client !== ws && client.readyState === 1) {
      client.send(JSON.stringify({
        type: "cursor",
        userId: data.userId,
        position: data.position
      }));
    }
  });
}

    ws.on("close", () => {
      if (!currentDocId) return;

      const room = activeDocs.get(currentDocId);
      if (!room) return;

      room.clients.delete(ws);

      console.log(`Client left doc: ${currentDocId}`);

      // Cleanup memory when no users
      if (room.clients.size === 0) {
        activeDocs.delete(currentDocId);
        console.log(`Room cache cleared: ${currentDocId}`);
      }
    });
  });

  console.log("WebSocket server initialized");
};