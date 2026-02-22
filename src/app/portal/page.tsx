"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SIGILS, SIGIL_EMOJIS, DEFAULT_CONQUESTS, type Sigil } from "@/lib/constants";

type Act = "loading" | "invalid" | "gate" | "summons" | "oath" | "forge" | "conquests" | "valhalla";

function fadeVolume(audio: HTMLAudioElement, from: number, to: number, durationMs: number) {
  const steps = 30;
  const stepMs = durationMs / steps;
  const delta = (to - from) / steps;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(0, Math.min(1, from + delta * step));
    if (step >= steps) {
      clearInterval(interval);
      audio.volume = Math.max(0, Math.min(1, to));
      if (to === 0) audio.pause();
    }
  }, stepMs);
  return interval;
}

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rune = searchParams.get("rune");
  const isPreview = searchParams.get("preview") === "true";

  const [act, setAct] = useState<Act>("loading");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Forge fields
  const [forgeStep, setForgeStep] = useState(1);
  const [vikingName, setVikingName] = useState("");
  const [sigil, setSigil] = useState<Sigil | "">("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  // Conquests
  const [selectedConquests, setSelectedConquests] = useState<number[]>([]);
  const [customConquest, setCustomConquest] = useState("");

  // Summons animation
  const [summonsLine, setSummonsLine] = useState(0);
  const [showSkip, setShowSkip] = useState(false);

  // Gate animation
  const [gatePulse, setGatePulse] = useState(false);

  // Valhalla reveal
  const [revealStep, setRevealStep] = useState(0);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio("/audio/langhus-burning.mp3");
    audio.loop = true;
    audio.volume = 0;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Gate pulse animation
  useEffect(() => {
    if (act !== "gate") return;
    const interval = setInterval(() => setGatePulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, [act]);

  useEffect(() => {
    if (isPreview) {
      setAct("gate");
      return;
    }
    if (!rune) {
      setError("No summoning rune found. Ask your chieftain for an invite.");
      setAct("invalid");
      return;
    }

    fetch(`/api/auth/portal?rune=${rune}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invalid rune");
        return r.json();
      })
      .then(() => setAct("gate"))
      .catch(() => {
        setError("This rune is invalid or has already been used.");
        setAct("invalid");
      });
  }, [rune, isPreview]);

  function startMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      fadeRef.current = fadeVolume(audio, 0, 0.4, 2000);
    }).catch(() => {});
  }

  function swellMusic() {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    fadeRef.current = fadeVolume(audio, audio.volume, 0.6, 1000);
  }

  function fadeOutMusic() {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    fadeRef.current = fadeVolume(audio, audio.volume, 0, 1500);
  }

  // Summons auto-advance
  useEffect(() => {
    if (act !== "summons") return;
    const skipTimer = setTimeout(() => setShowSkip(true), 3000);
    const timers = [
      setTimeout(() => setSummonsLine(1), 1500),
      setTimeout(() => setSummonsLine(2), 5000),
      setTimeout(() => setSummonsLine(3), 8500),
      setTimeout(() => setAct("oath"), 13000),
    ];
    return () => { clearTimeout(skipTimer); timers.forEach(clearTimeout); };
  }, [act]);

  // Valhalla reveal auto-advance + music swell
  useEffect(() => {
    if (act !== "valhalla") return;
    const timers = [
      setTimeout(() => setRevealStep(1), 800),
      setTimeout(() => setRevealStep(2), 2200),
      setTimeout(() => { setRevealStep(3); swellMusic(); }, 3500),
      setTimeout(() => setRevealStep(4), 5000),
      setTimeout(() => setRevealStep(5), 6500),
    ];
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  function toggleConquest(index: number) {
    setSelectedConquests((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 5) return prev;
      return [...prev, index];
    });
  }

  const handleComplete = useCallback(async () => {
    if (isPreview) {
      setAct("valhalla");
      return;
    }

    setError("");
    setLoading(true);

    const conquestData: { title: string; description: string; xpReward: number; isCustom: boolean }[] = selectedConquests.map((i) => ({
      title: DEFAULT_CONQUESTS[i].title as string,
      description: DEFAULT_CONQUESTS[i].description as string,
      xpReward: DEFAULT_CONQUESTS[i].xpReward as number,
      isCustom: false,
    }));

    if (customConquest.trim()) {
      conquestData.push({
        title: customConquest.trim(),
        description: "Custom conquest",
        xpReward: 50,
        isCustom: true,
      });
    }

    try {
      const res = await fetch("/api/auth/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rune,
          vikingName,
          pin,
          sigil,
          conquests: conquestData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      setAct("valhalla");
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [isPreview, selectedConquests, customConquest, rune, vikingName, pin, sigil]);

  // ─── ACT: Invalid ───
  if (act === "invalid") {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-[family-name:var(--font-cinzel)] text-fire mb-4">
            The Rune Has Faded
          </h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  // ─── ACT: Loading ───
  if (act === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <div className="text-fire text-xl font-[family-name:var(--font-cinzel)] animate-pulse">
          Reading the runes...
        </div>
      </div>
    );
  }

  // ─── ACT 0: The Gate ───
  if (act === "gate") {
    return (
      <div
        className="min-h-dvh flex items-center justify-center bg-black cursor-pointer"
        onClick={() => {
          startMusic();
          setAct("summons");
        }}
      >
        <div className="text-center">
          <div
            className={`text-6xl md:text-7xl font-[family-name:var(--font-cinzel)] text-fire transition-all duration-1000 ${
              gatePulse ? "opacity-100 scale-110" : "opacity-40 scale-100"
            }`}
          >
            ᛟ
          </div>
          <p className="text-muted/50 text-sm mt-8 font-[family-name:var(--font-cinzel)] tracking-widest animate-pulse">
            Touch the rune
          </p>
        </div>
      </div>
    );
  }

  // ─── ACT I: The Summons ───
  if (act === "summons") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-fire/60 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: `-5%`,
                animation: `ember ${4 + Math.random() * 6}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        <div className="text-center px-8 max-w-lg relative z-10">
          <div
            className={`transition-all duration-1000 ${
              summonsLine >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-2xl md:text-3xl font-[family-name:var(--font-cinzel)] text-fire mb-8 tracking-wide">
              You have been summoned.
            </p>
          </div>

          <div
            className={`transition-all duration-1000 ${
              summonsLine >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-lg md:text-xl font-[family-name:var(--font-cinzel)] text-foreground/80 mb-8">
              Six warriors. One journey. 202 days.
            </p>
          </div>

          <div
            className={`transition-all duration-1000 ${
              summonsLine >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-xl md:text-2xl font-[family-name:var(--font-cinzel)] text-gold tracking-wider">
              The Iron Viking awaits.
            </p>
          </div>
        </div>

        {showSkip && (
          <button
            onClick={() => setAct("oath")}
            className="absolute top-6 right-6 text-xs text-muted/40 hover:text-muted transition-colors font-[family-name:var(--font-cinzel)]"
          >
            ᛊ skip
          </button>
        )}

        <style jsx>{`
          @keyframes ember {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 0.5; }
            100% { transform: translateY(-100vh) scale(0); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // ─── ACT II: The Oath ───
  if (act === "oath") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black px-4">
        <div className="max-w-lg text-center">
          <div className="space-y-6 mb-10">
            <p className="text-foreground/80 text-sm md:text-base leading-relaxed italic">
              &ldquo;Each week you will log your miles, your battles in the gym, and your deeds of strength.&rdquo;
            </p>
            <p className="text-foreground/80 text-sm md:text-base leading-relaxed italic">
              &ldquo;Points are earned. Realms are claimed. The worthy ascend to Asgard. The rest endure Niflheim.&rdquo;
            </p>
            <p className="text-foreground/80 text-sm md:text-base leading-relaxed italic">
              &ldquo;On the twelfth day of September, you will stand together at the start line of the Iron Viking — 42 kilometres of mud, obstacles, and will.&rdquo;
            </p>

            <div className="rune-divider my-8" />

            <p className="text-xl font-[family-name:var(--font-cinzel)] text-gold tracking-wide">
              Do you swear the oath?
            </p>
          </div>

          <button
            onClick={() => setAct("forge")}
            className="bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold text-lg px-12 py-4 rounded-lg hover:bg-fire/90 transition-all active:scale-95"
          >
            I SWEAR IT
          </button>
        </div>
      </div>
    );
  }

  // ─── ACT III: Forge Your Viking ───
  if (act === "forge") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black px-4 py-8">
        <div className="max-w-md w-full">
          <div className="flex justify-center gap-4 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-[family-name:var(--font-cinzel)] transition-all duration-300 ${
                  s <= forgeStep
                    ? "bg-fire text-background font-bold"
                    : "bg-card-border/30 text-muted/50"
                }`}
              >
                ᛟ
              </div>
            ))}
          </div>

          <h2 className="text-center text-xl font-[family-name:var(--font-cinzel)] text-fire mb-6">
            Forge Your Viking
          </h2>

          {forgeStep === 1 && (
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <p className="text-center text-muted italic text-sm mb-4">
                Speak your name into the void.
              </p>
              <input
                type="text"
                value={vikingName}
                onChange={(e) => setVikingName(e.target.value.slice(0, 20))}
                className="w-full bg-transparent border-b-2 border-fire/30 focus:border-fire px-2 py-4 text-center text-2xl font-[family-name:var(--font-cinzel)] text-foreground focus:outline-none"
                placeholder="Your Viking Name"
                maxLength={20}
                autoFocus
              />
              <div className="text-center text-xs text-muted">{vikingName.length}/20</div>
              <button
                onClick={() => vikingName.trim() && setForgeStep(2)}
                disabled={!vikingName.trim()}
                className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg disabled:opacity-50 transition-colors mt-4"
              >
                Claim This Name
              </button>
            </div>
          )}

          {forgeStep === 2 && (
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <p className="text-center text-muted italic text-sm mb-4">
                Choose your sigil, warrior.
              </p>
              <div className="grid grid-cols-5 gap-3">
                {SIGILS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSigil(s)}
                    className={`aspect-square flex flex-col items-center justify-center text-3xl rounded-lg border-2 transition-all ${
                      sigil === s
                        ? "border-fire bg-fire/10 scale-110 shadow-lg shadow-fire/20"
                        : "border-card-border/50 bg-card/50 hover:border-fire/30"
                    }`}
                  >
                    {SIGIL_EMOJIS[s]}
                    <span className="text-[8px] text-muted mt-1 capitalize">{s}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => sigil && setForgeStep(3)}
                disabled={!sigil}
                className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg disabled:opacity-50 transition-colors mt-4"
              >
                Bear This Sigil
              </button>
              <button onClick={() => setForgeStep(1)} className="w-full text-center text-muted text-sm hover:text-foreground">
                ← Back
              </button>
            </div>
          )}

          {forgeStep === 3 && (
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <p className="text-center text-muted italic text-sm mb-4">
                Seal your identity with a rune-code.
              </p>
              <div>
                <label className="block text-xs text-muted mb-1">4-digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-card border border-card-border rounded-lg px-4 py-3 text-foreground text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-fire/50"
                  placeholder="····"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-card border border-card-border rounded-lg px-4 py-3 text-foreground text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-fire/50"
                  placeholder="····"
                />
              </div>
              {error && <div className="text-red-400 text-sm text-center">{error}</div>}
              <button
                onClick={() => {
                  if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
                  if (pin !== pinConfirm) { setError("PINs do not match"); return; }
                  setError("");
                  setAct("conquests");
                }}
                disabled={pin.length !== 4}
                className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg disabled:opacity-50 transition-colors"
              >
                Seal It
              </button>
              <button onClick={() => setForgeStep(2)} className="w-full text-center text-muted text-sm hover:text-foreground">
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ACT IV: Conquests ───
  if (act === "conquests") {
    return (
      <div className="min-h-dvh bg-black px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-fire">
              Choose Your Conquests
            </h2>
            <p className="text-muted text-sm mt-2 italic">
              Every warrior needs personal glory to chase. Choose five conquests you will claim before race day.
            </p>
            <div className="mt-3">
              <span className={`text-sm font-[family-name:var(--font-cinzel)] ${selectedConquests.length === 5 ? "text-gold font-bold" : "text-muted"}`}>
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
                      ? "border-card-border/30 bg-card/30 opacity-40"
                      : "border-card-border/50 bg-card/50 hover:border-fire/30"
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

          <div className="mb-6">
            <label className="block text-xs text-muted mb-1">+ Forge your own (optional)</label>
            <input
              type="text"
              value={customConquest}
              onChange={(e) => setCustomConquest(e.target.value.slice(0, 80))}
              className="w-full bg-card/50 border border-card-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-fire/50"
              placeholder="e.g. Run a half marathon"
            />
            {customConquest && (
              <div className="text-[10px] text-muted mt-1">Custom conquests are worth 50 XP and need admin approval.</div>
            )}
          </div>

          {error && <div className="text-red-400 text-sm text-center mb-3">{error}</div>}

          <button
            onClick={handleComplete}
            disabled={loading || selectedConquests.length < 5}
            className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-4 rounded-lg text-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "Forging your destiny..." : "Enter Valhalla"}
          </button>

          <button
            onClick={() => setAct("forge")}
            className="w-full text-center text-muted text-sm mt-3 hover:text-foreground"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ─── ACT V: Enter Valhalla ───
  if (act === "valhalla") {
    const displaySigil = SIGIL_EMOJIS[(sigil || "axe") as Sigil];

    return (
      <div className="min-h-dvh flex items-center justify-center bg-black px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-fire/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: `-5%`,
                animation: `ember ${5 + Math.random() * 5}s linear infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        <div className="text-center relative z-10">
          <div
            className={`transition-all duration-1000 ${
              revealStep >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
          >
            <div className="text-7xl md:text-8xl mb-6">{displaySigil}</div>
          </div>

          <div
            className={`transition-all duration-1000 ${
              revealStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-cinzel)] font-bold text-foreground mb-4 tracking-wider">
              {vikingName || "Warrior"}
            </h1>
          </div>

          <div
            className={`transition-all duration-1000 ${
              revealStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div className="text-muted text-sm mb-1">Title: <span className="text-foreground"><span className="opacity-60 mr-1">ᚦ</span>Thrall</span></div>
            <div className="text-ice text-sm mb-6">Realm: <span className="font-[family-name:var(--font-cinzel)]">Niflheim</span></div>
            <p className="text-muted text-xs italic mb-8">
              All warriors begin in the cold. The fire is earned.
            </p>
          </div>

          <div
            className={`transition-all duration-1000 ${
              revealStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-lg font-[family-name:var(--font-cinzel)] text-gold tracking-wide mb-8">
              Welcome, {vikingName || "Warrior"}. Your saga begins.
            </p>
          </div>

          <div
            className={`transition-all duration-700 ${
              revealStep >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <button
              onClick={() => {
                fadeOutMusic();
                router.push("/dashboard");
              }}
              className="bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold text-lg px-12 py-4 rounded-lg hover:bg-fire/90 transition-all"
            >
              Enter the Hall
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes ember {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 0.5; }
            100% { transform: translateY(-100vh) scale(0); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return null;
}

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <div className="text-fire text-xl font-[family-name:var(--font-cinzel)] animate-pulse">
          Reading the runes...
        </div>
      </div>
    }>
      <PortalContent />
    </Suspense>
  );
}
