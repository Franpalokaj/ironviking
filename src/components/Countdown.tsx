"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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

  const digits = String(days).split("");

  return (
    <div className="text-center pt-24 pb-6">
      {/* Digit images */}
      <div className="relative inline-flex items-center justify-center gap-1">
        {digits.map((d, i) => (
          <Image
            unoptimized
            key={i}
            src={`/images/ui/digits/${d}.png`}
            alt={d}
            width={120}
            height={200}
            className="h-[126px] w-auto drop-shadow-lg"
          />
        ))}
      </div>

      {/* Phrase with knot decorators */}
      <div className="relative flex items-center justify-center gap-3 mt-5">
        <Image
          unoptimized
          src="/images/ui/decorators/knot-left.png"
          alt=""
          width={20}
          height={20}
          className="opacity-50"
        />
        <span className="text-base md:text-lg text-muted font-[family-name:var(--font-cinzel)] italic tracking-wide uppercase">
          {phrase}
        </span>
        <Image
          unoptimized
          src="/images/ui/decorators/knot-right.png"
          alt=""
          width={20}
          height={20}
          className="opacity-50"
        />
      </div>
    </div>
  );
}
