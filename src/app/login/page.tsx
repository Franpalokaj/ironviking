"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LINK_ERRORS: Record<string, string> = {
  missing: "No login link was provided.",
  invalid_link: "This login link is invalid or has already been used.",
  expired: "This login link has expired. Ask your chieftain for a new one.",
  failed: "Something went wrong. Try again or log in with your name and rune-code.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vikingName, setVikingName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  useEffect(() => {
    if (token) {
      window.location.href = `/api/auth/login-link?token=${encodeURIComponent(token)}`;
    }
  }, [token]);

  useEffect(() => {
    if (linkError) {
      setError(LINK_ERRORS[linkError] || "Login link failed.");
    }
  }, [linkError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vikingName, pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-fire tracking-wider">
            Iron Viking
          </h1>
          <p className="text-muted mt-2 text-sm">Enter your name and rune-code</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Viking Name</label>
            <input
              type="text"
              value={vikingName}
              onChange={(e) => setVikingName(e.target.value)}
              className="w-full bg-card border border-card-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-fire/50 font-[family-name:var(--font-cinzel)]"
              placeholder="Speak your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Rune-Code</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full bg-card border border-card-border rounded-lg px-4 py-3 text-foreground text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-fire/50"
              placeholder="····"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !vikingName || pin.length !== 4}
            className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg hover:bg-fire/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Entering..." : "Enter Valhalla"}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          No account? Ask your chieftain for a summoning rune.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-fire font-[family-name:var(--font-cinzel)] animate-pulse">Entering the hall...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
