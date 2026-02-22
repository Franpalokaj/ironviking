"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SIGILS, SIGIL_EMOJIS, DEFAULT_CONQUESTS, type Sigil } from "@/lib/constants";

export default function SetupPage() {
  const router = useRouter();
  const [hasPlayers, setHasPlayers] = useState<boolean | null>(null);
  const [step, setStep] = useState<"identity" | "conquests" | "done">("identity");

  // Identity fields
  const [vikingName, setVikingName] = useState("");
  const [pin, setPin] = useState("");
  const [sigil, setSigil] = useState<Sigil | "">("");

  // Conquests
  const [selectedConquests, setSelectedConquests] = useState<number[]>([]);
  const [customConquest, setCustomConquest] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLinks, setInviteLinks] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => {
        setHasPlayers(d.hasPlayers);
        if (d.hasPlayers) router.push("/login");
      });
  }, [router]);

  function toggleConquest(index: number) {
    setSelectedConquests((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 5) return prev;
      return [...prev, index];
    });
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);

    const conquests = selectedConquests.map((i) => ({
      title: DEFAULT_CONQUESTS[i].title,
      description: DEFAULT_CONQUESTS[i].description,
      xpReward: DEFAULT_CONQUESTS[i].xpReward,
      isCustom: false,
    }));

    if (customConquest.trim()) {
      conquests.push({
        title: customConquest.trim(),
        description: "Custom conquest",
        xpReward: 50,
        isCustom: true,
      });
    }

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vikingName, pin, sigil, conquests }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Setup failed");
        return;
      }

      const data = await res.json();
      const base = window.location.origin;
      const links = data.invites.map((inv: { token: string; playerSlot: number }) =>
        `Slot ${inv.playerSlot}: ${base}/portal?rune=${inv.token}`
      );
      setInviteLinks(links);
      setStep("done");
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  if (hasPlayers === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-fire font-[family-name:var(--font-cinzel)] animate-pulse">Checking the forge...</div>
      </div>
    );
  }

  if (step === "done" && inviteLinks.length > 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">⚔️</div>
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-fire">
              The Forge Is Lit
            </h2>
            <p className="text-muted text-sm mt-2">
              You are the first warrior — and the admin. Send these runes to your fellow Vikings.
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {inviteLinks.map((link, i) => (
              <div key={i} className="bg-card border border-card-border rounded-lg p-3">
                <div className="text-xs font-mono text-muted break-all select-all">{link}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg"
          >
            Enter the Hall
          </button>
        </div>
      </div>
    );
  }

  if (step === "conquests") {
    return (
      <div className="min-h-dvh px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-fire">
              Choose Your Conquests
            </h2>
            <p className="text-muted text-sm mt-2 italic">
              Every warrior needs personal glory to chase. Choose five conquests you will claim before race day.
            </p>
            <div className="mt-2 text-sm">
              <span className={selectedConquests.length === 5 ? "text-gold font-bold" : "text-muted"}>
                {selectedConquests.length} / 5 selected
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {DEFAULT_CONQUESTS.map((c, i) => {
              const selected = selectedConquests.includes(i);
              const disabled = !selected && selectedConquests.length >= 5;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleConquest(i)}
                  disabled={disabled}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selected
                      ? "border-gold bg-gold/10"
                      : disabled
                      ? "border-card-border bg-card opacity-40"
                      : "border-card-border bg-card hover:border-fire/30"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{c.title}</div>
                      <div className="text-xs text-muted mt-0.5">{c.description}</div>
                    </div>
                    <span className="text-xs text-gold font-bold whitespace-nowrap ml-2">{c.xpReward} XP</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-4">
            <label className="block text-xs text-muted mb-1">+ Forge your own (optional, replaces one pick)</label>
            <input
              type="text"
              value={customConquest}
              onChange={(e) => setCustomConquest(e.target.value.slice(0, 80))}
              className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-fire/50"
              placeholder="e.g. Run a half marathon"
            />
            {customConquest && (
              <div className="text-[10px] text-muted mt-1">Custom conquests are worth 50 XP and need admin approval.</div>
            )}
          </div>

          {error && <div className="text-red-400 text-sm text-center mb-3">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading || selectedConquests.length < 5}
            className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg hover:bg-fire/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Forging..." : "Seal Your Conquests"}
          </button>

          <button
            onClick={() => setStep("identity")}
            className="w-full text-center text-muted text-sm mt-3 hover:text-foreground"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-fire tracking-wider">
            Iron Viking
          </h1>
          <p className="text-muted mt-2 text-sm">First warrior setup — you will be the admin.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Your Viking Name</label>
            <input
              type="text"
              value={vikingName}
              onChange={(e) => setVikingName(e.target.value.slice(0, 20))}
              className="w-full bg-card border border-card-border rounded-lg px-4 py-3 text-foreground font-[family-name:var(--font-cinzel)] focus:outline-none focus:border-fire/50"
              placeholder="Speak your name"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Choose your sigil</label>
            <div className="grid grid-cols-5 gap-2">
              {SIGILS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSigil(s)}
                  className={`aspect-square flex items-center justify-center text-2xl rounded-lg border-2 transition-all ${
                    sigil === s
                      ? "border-fire bg-fire/10 scale-110"
                      : "border-card-border bg-card hover:border-fire/30"
                  }`}
                >
                  {SIGIL_EMOJIS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">4-digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full bg-card border border-card-border rounded-lg px-4 py-3 text-foreground text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-fire/50"
              placeholder="····"
            />
          </div>

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          <button
            onClick={() => {
              if (!vikingName.trim()) { setError("Name is required"); return; }
              if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
              if (!sigil) { setError("Choose a sigil"); return; }
              setError("");
              setStep("conquests");
            }}
            disabled={!vikingName || pin.length !== 4 || !sigil}
            className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg hover:bg-fire/90 disabled:opacity-50 transition-colors"
          >
            Next — Choose Your Conquests
          </button>
        </div>
      </div>
    </div>
  );
}
