import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function App() {
  const [health, setHealth] = useState<string>("checking…");

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.json())
      .then((d) => setHealth(d.status ?? "unknown"))
      .catch(() => setHealth("unreachable"));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Transfer-Ready</h1>
      <p>AI-assisted account transfer processing.</p>
      <p>
        Backend status: <strong>{health}</strong>
      </p>
    </main>
  );
}
