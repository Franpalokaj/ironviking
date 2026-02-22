"use client";

import { useState, useEffect } from "react";
import { COUNTDOWN_PHRASES } from "@/lib/constants";

export default function Countdown() {
  const [days, setDays] = useState(0);
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    function update() {
      const race = new Date("2026-09-12T00:00:00+02:00");
      const now = new Date();
      const diff = race.getTime() - now.getTime();
      setDays(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    }
    update();
    const interval = setInterval(update, 60000);
    setPhrase(COUNTDOWN_PHRASES[Math.floor(Math.random() * COUNTDOWN_PHRASES.length)]);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center py-6">
      <div className="text-6xl md:text-8xl font-bold font-[family-name:var(--font-cinzel)] text-fire tracking-wider">
        {days}
      </div>
      <div className="text-lg md:text-xl text-muted mt-2 font-[family-name:var(--font-cinzel)] italic tracking-wide">
        {phrase}
      </div>
    </div>
  );
}
