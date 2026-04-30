"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-8 px-6"
      style={{ minHeight: "calc(100vh - 80px)", background: "var(--color-bg)" }}
    >
      <div className="text-center">
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 12,
          }}
        >
          Opponent
          <br />
          <span style={{ color: "var(--color-accent)" }}>Analysis</span>{" "}
          Station
        </h2>
        <p
          style={{
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "#666",
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          Tag spatial match events fast. Scout opponent patterns across matches.
          All in one brutalist interface.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/tagger"
          className="brutal-btn"
          style={{
            background: "#000",
            color: "#fff",
            fontSize: "1rem",
            padding: "14px 32px",
          }}
        >
          ⚡ Open Tagger
        </Link>
        <Link
          href="/dashboard"
          className="brutal-btn"
          style={{
            background: "var(--color-accent)",
            color: "#000",
            fontSize: "1rem",
            padding: "14px 32px",
          }}
        >
          📊 Dashboard
        </Link>
      </div>

      {/* Feature cards */}
      <div
        className="grid gap-4 w-full"
        style={{
          maxWidth: 800,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginTop: 20,
        }}
      >
        {[
          {
            icon: "🎯",
            title: "Zone Tagging",
            desc: "12×8 grid pitch for ball gains & losses",
            color: "var(--color-badge-teal)",
          },
          {
            icon: "📍",
            title: "Shot Mapping",
            desc: "Exact XY coordinates with outcome tracking",
            color: "var(--color-badge-blue)",
          },
          {
            icon: "🔄",
            title: "L2R Normalization",
            desc: "Auto-normalize all data to left-to-right",
            color: "var(--color-badge-orange)",
          },
          {
            icon: "🔥",
            title: "Heatmaps",
            desc: "Aggregate patterns across multiple matches",
            color: "var(--color-badge-purple)",
          },
        ].map((feat) => (
          <div
            key={feat.title}
            className="brutal-card p-4"
            style={{ background: feat.color + "22" }}
          >
            <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>
              {feat.icon}
            </div>
            <h3
              style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: 4 }}
            >
              {feat.title}
            </h3>
            <p style={{ fontSize: "0.7rem", fontWeight: 500, color: "#555" }}>
              {feat.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
