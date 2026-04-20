import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // debounce query by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get("http://localhost:4000/api/tools", { params: { q: debouncedQ, limit: 20 } })
      .then((r) => {
        if (!cancelled) setResults(r.data.results || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  return (
    <div style={{ padding: 24 }}>
      <h1>GStack Frontend - Search</h1>
      <div style={{ marginBottom: 12 }}>
        <input
          aria-label="Search"
          placeholder="Search tools..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 8, width: 400 }}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p>Results: {results.length}</p>
          <ul>
            {results.map((r) => (
              <li key={r.id} style={{ marginBottom: 8 }}>
                <strong>{r.name}</strong> — <em>{r.category}</em>
                <div>{r.short_description}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{r.tags?.join(', ')}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
