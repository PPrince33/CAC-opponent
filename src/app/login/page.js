"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/tagger");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center px-6"
      style={{ minHeight: "calc(100vh - 80px)", background: "var(--color-bg)" }}
    >
      <div className="brutal-card p-6 w-full" style={{ maxWidth: 400 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 20, textAlign: "center" }}>
          ANALYST LOGIN
        </h2>
        
        {error && (
          <div
            className="brutal-border"
            style={{
              background: "#FEE2E2",
              color: "#991B1B",
              padding: "8px 12px",
              fontSize: "0.8rem",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, display: "block", marginBottom: 4 }}>
              EMAIL
            </label>
            <input
              type="email"
              className="brutal-input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, display: "block", marginBottom: 4 }}>
              PASSWORD
            </label>
            <input
              type="password"
              className="brutal-input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="brutal-btn mt-2"
            disabled={loading}
            style={{
              background: "var(--color-accent)",
              color: "#000",
              width: "100%",
            }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
