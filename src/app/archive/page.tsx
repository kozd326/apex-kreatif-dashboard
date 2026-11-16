"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/apex/workspace";
import "@/components/apex/workspace.css";
export default function Archive() {
  const [data, setData] = useState<any[]>([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState("");
  useEffect(() => {
    api("archive")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const item = data.find((d) => d.source === selected);
  return (
    <main className="ax-app" style={{ display: "block", padding: 35 }}>
      <Link className="ax-button secondary" href="/settings">
        ← Ayarlara dön
      </Link>
      <h1 style={{ fontSize: 27, margin: "25px 0 10px" }}>
        Eski kayıtlar arşivi
      </h1>
      <p className="ax-muted">
        Geçiş öncesi kayıtların salt okunur kopyası. Araştırma ve otomatik
        iletişim işlemleri kapalıdır.
      </p>
      {error && <p className="ax-notice error">{error}</p>}
      <div className="ax-toolbar">
        <select
          aria-label="Arşiv kayıt türü"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Kayıt türü seçin</option>
          {data.map((d) => (
            <option key={d.source} value={d.source}>
              {d.label} ({d.rows.length})
            </option>
          ))}
        </select>
      </div>
      {item?.rows.map((r: any, i: number) => (
        <details
          className="ax-panel ax-pad"
          style={{ margin: "12px 0" }}
          key={r.id || i}
        >
          <summary>
            {r.name ||
              r.company_name ||
              r.project_name ||
              r.title ||
              r.business_name ||
              `Kayıt ${i + 1}`}
          </summary>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(100px,200px) 1fr",
              gap: 12,
              marginTop: 20,
            }}
          >
            {Object.entries(r)
              .filter(
                ([k, v]) => v !== null && !["id", "created_by"].includes(k),
              )
              .map(([k, v]) => (
                <div style={{ display: "contents" }} key={k}>
                  <dt className="ax-muted">{k}</dt>
                  <dd
                    style={{
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </dd>
                </div>
              ))}
          </dl>
        </details>
      ))}
    </main>
  );
}
