"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navLinks = [
    { href: "/tagger", label: "⚡ Tagger" },
    { href: "/dashboard", label: "📊 Dashboard" },
  ];

  return (
    <html lang="en">
      <head>
        <title>CAC OPPONENT SCOUT</title>
        <meta
          name="description"
          content="Football video analysis and opponent scouting dashboard"
        />
      </head>
      <body className="min-h-screen">
        {/* ─── HEADER ─── */}
        <header
          style={{
            background: "#000",
            borderBottom: "4px solid #34D399",
          }}
          className="px-6 py-4 flex items-center justify-between"
        >
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div
              style={{
                background: "#34D399",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #000",
                fontWeight: 800,
                fontSize: "1.2rem",
                color: "#000",
              }}
            >
              ⚽
            </div>
            <h1
              style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 800 }}
              className="tracking-wider hidden sm:block"
            >
              CAC{" "}
              <span style={{ color: "#34D399" }}>OPPONENT</span>{" "}
              SCOUT
            </h1>
          </Link>

          <nav className="flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    background: isActive ? "#34D399" : "transparent",
                    color: isActive ? "#000" : "#fff",
                    border: "3px solid",
                    borderColor: isActive ? "#000" : "#34D399",
                    padding: "8px 20px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                    transition: "all 0.1s ease",
                    boxShadow: isActive
                      ? "3px 3px 0px 0px rgba(52,211,153,0.5)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.background = "#34D399";
                      e.target.style.color = "#000";
                      e.target.style.borderColor = "#000";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.background = "transparent";
                      e.target.style.color = "#fff";
                      e.target.style.borderColor = "#34D399";
                    }
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            {user && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                }}
                className="brutal-btn ml-4"
                style={{
                  background: "#F87171",
                  color: "#000",
                  fontSize: "0.75rem",
                  padding: "8px 16px",
                }}
              >
                SIGN OUT
              </button>
            )}
          </nav>
        </header>

        {/* ─── MAIN ─── */}
        <main>{children}</main>
      </body>
    </html>
  );
}
