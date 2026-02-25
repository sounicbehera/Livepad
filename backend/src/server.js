import dotenv from 'dotenv';
dotenv.config();
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { getRoom, removeClient } from "./rooms.js";

const JWT_SECRET = process.env.JWT_SECRET || "iamverysmart";

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    let currentRoom = null;
    let userId = null;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "No token provided");
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
      console.log(`✅ User ${decoded.email} connected to WebSocket`);
    } catch (err) {
      console.error("WebSocket token error:", err.message);
      ws.close(4003, "Invalid token");
      return;
    }

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "join") {
          currentRoom = data.roomId;
          const room = getRoom(currentRoom);
          room.clients.add(ws);

          console.log(`👤 User ${userId} joined room: ${currentRoom}`);

          ws.send(
            JSON.stringify({
              type: "init",
              content: room.content,
              userId: userId,
            })
          );
        }

        if (data.type === "edit") {
          const room = getRoom(currentRoom);
          room.content = data.content;

          room.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(
                JSON.stringify({
                  type: "update",
                  content: room.content,
                  editedBy: userId,
                })
              );
            }
          });
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      if (currentRoom) {
        removeClient(currentRoom, ws);
        console.log(`❌ User ${userId} left room: ${currentRoom}`);
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });
}