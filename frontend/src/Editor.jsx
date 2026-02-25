import { useEffect, useRef, useState } from "react";

export default function Editor() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [content, setContent] = useState("");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        type: "join",
        docId: "demo-doc"
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "init" || msg.type === "update") {
        setContent(msg.content);
      }
    };

    ws.onclose = () => setConnected(false);

    return () => ws.close();
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);

    wsRef.current?.send(JSON.stringify({
      type: "edit",
      content: value
    }));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Collab Editor</h2>
      <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>

      <textarea
        value={content}
        onChange={handleChange}
        rows={20}
        cols={80}
      />
    </div>
  );
}