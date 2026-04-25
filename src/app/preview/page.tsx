"use client";

import Image from "next/image";

// ─── Sample data ───────────────────────────────────────────
const SAMPLE = {
  name: "Ragnar",
  sigil: "/images/sigils/wolf.png",
  titleIcon: "/images/titles/raider.png",
  titleName: "Raider",
  realmIcon: "/images/realms/asgard.png",
  realmName: "Asgard",
  realmColor: "#c8a22a", // gold for Asgard
  weekPoints: 42,
  xp: 890,
  xpProgress: 58,
};

// ─── Ornamental divider ────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      <div className="text-gold/40 text-xs">&#x2666;&#x2666;</div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </div>
  );
}

// ─── XP Bar ────────────────────────────────────────────────
function XPBar({ progress }: { progress: number }) {
  return (
    <div className="w-[95%] mx-auto">
      <div className="bg-card-border rounded-full overflow-hidden" style={{ height: "6px" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: "#98581E" }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VERSION D — "Title Watermark"
// Current banner layout + title icon as large faded watermark
// ═══════════════════════════════════════════════════════════
function CardVersionD() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ backgroundImage: "url(/images/ui/backgrounds/card-bg-1.png)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", aspectRatio: "800 / 448" }}
    >
      {/* Title icon watermark */}
      <div className="absolute right-[0.5%] top-[47%] -translate-y-1/2 opacity-[0.077] pointer-events-none">
        <Image
          unoptimized
          src={SAMPLE.titleIcon}
          alt=""
          width={180}
          height={180}
          className="select-none"
          draggable={false}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full py-5 px-5">
        {/* Sigil centered */}
        <div className="flex justify-center mb-2">
          <Image
            unoptimized
            src={SAMPLE.sigil}
            alt="Wolf sigil"
            width={80}
            height={80}
            className="drop-shadow-lg"
          />
        </div>

        {/* Name centered */}
        <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl tracking-wide text-center" style={{ marginTop: "-6px" }}>
          {SAMPLE.name}
        </h3>

        {/* Realm + Title centered row */}
        <div className="flex items-center justify-center gap-4" style={{ marginTop: "5px" }}>
          <div className="flex items-center gap-1.5">
            <Image unoptimized src={SAMPLE.realmIcon} alt={SAMPLE.realmName} width={22} height={22} />
            <span className="text-gold font-[family-name:var(--font-cinzel)] text-sm font-semibold">
              {SAMPLE.realmName}
            </span>
          </div>
          <div className="w-px h-4 bg-gold/20" />
          <div className="flex items-center gap-1.5">
            <Image unoptimized src={SAMPLE.titleIcon} alt={SAMPLE.titleName} width={22} height={22} />
            <span className="text-raider font-[family-name:var(--font-cinzel)] text-sm font-semibold">
              {SAMPLE.titleName}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between w-[95%] mx-auto mb-2" style={{ marginTop: "20px", fontSize: "16px" }}>
          <span className="text-fire font-bold">
            {SAMPLE.weekPoints} <span className="font-normal">pts</span>
          </span>
          <span className="text-gold font-semibold">
            {SAMPLE.xp} XP
          </span>
        </div>

        <XPBar progress={SAMPLE.xpProgress} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VERSION G — Duplicate of D with realm icon top-left
// ═══════════════════════════════════════════════════════════
function CardVersionG() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ backgroundImage: "url(/images/ui/backgrounds/card-bg-1.png)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", aspectRatio: "800 / 448" }}
    >
      {/* Title icon watermark — right side */}
      <div className="absolute right-[0.5%] top-[47%] -translate-y-1/2 opacity-[0.077] pointer-events-none">
        <Image
          unoptimized
          src={SAMPLE.titleIcon}
          alt=""
          width={180}
          height={180}
          className="select-none"
          draggable={false}
        />
      </div>

      {/* Rank color diagonal light from top-left */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${SAMPLE.realmColor}20 0%, transparent 40%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full py-5 px-5">
        {/* Sigil centered */}
        <div className="flex justify-center mb-2">
          <Image unoptimized src={SAMPLE.sigil} alt="Wolf sigil" width={80} height={80} className="drop-shadow-lg" />
        </div>

        {/* Name centered */}
        <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl tracking-wide text-center">
          {SAMPLE.name}
        </h3>

        {/* Realm + Title centered row */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <Image unoptimized src={SAMPLE.realmIcon} alt={SAMPLE.realmName} width={22} height={22} />
            <span className="text-gold font-[family-name:var(--font-cinzel)] text-sm font-semibold">
              {SAMPLE.realmName}
            </span>
          </div>
          <div className="w-px h-4 bg-gold/20" />
          <div className="flex items-center gap-1.5">
            <Image unoptimized src={SAMPLE.titleIcon} alt={SAMPLE.titleName} width={22} height={22} />
            <span className="text-raider font-[family-name:var(--font-cinzel)] text-sm font-semibold">
              {SAMPLE.titleName}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between w-[95%] mx-auto mt-3 mb-2">
          <span className="text-fire font-bold text-lg">
            {SAMPLE.weekPoints} <span className="text-sm font-normal">pts</span>
          </span>
          <span className="text-gold font-semibold text-sm">
            {SAMPLE.xp} XP
          </span>
        </div>

        <XPBar progress={SAMPLE.xpProgress} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VERSION H — "Sigil Shield"
// Title icon hero. Sigil shown larger behind/below title icon
// at low opacity, creating a layered crest. Rank color border.
// ═══════════════════════════════════════════════════════════
function CardVersionH() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ backgroundImage: "url(/images/ui/backgrounds/card-bg-1.png)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", aspectRatio: "800 / 448" }}
    >
      {/* Rank color top gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${SAMPLE.realmColor}10 0%, transparent 35%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full py-5 px-5">
        {/* Layered crest: sigil behind, title icon in front */}
        <div className="flex justify-center mb-1">
          <div className="relative">
            {/* Sigil — larger, faded, behind */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Image
                unoptimized
                src={SAMPLE.sigil}
                alt=""
                width={120}
                height={120}
                className="opacity-15 select-none"
                draggable={false}
              />
            </div>
            {/* Title icon — front and center */}
            <Image
              unoptimized
              src={SAMPLE.titleIcon}
              alt={SAMPLE.titleName}
              width={80}
              height={80}
              className="drop-shadow-lg relative z-10"
            />
          </div>
        </div>

        {/* Title name */}
        <div className="text-center mb-2">
          <span className="text-raider font-[family-name:var(--font-cinzel)] text-sm font-semibold tracking-wider uppercase">
            {SAMPLE.titleName}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl tracking-wide text-center">
          {SAMPLE.name}
        </h3>

        {/* Realm */}
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <Image unoptimized src={SAMPLE.realmIcon} alt={SAMPLE.realmName} width={20} height={20} />
          <span className="text-gold font-[family-name:var(--font-cinzel)] text-sm font-semibold">
            {SAMPLE.realmName}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between w-[95%] mx-auto mt-3 mb-2">
          <span className="text-fire font-bold text-lg">
            {SAMPLE.weekPoints} <span className="text-sm font-normal">pts</span>
          </span>
          <span className="text-gold font-semibold text-sm">
            {SAMPLE.xp} XP
          </span>
        </div>

        <XPBar progress={SAMPLE.xpProgress} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VERSION I — "Full Atmosphere"
// Realm icon giant background. Title icon hero top.
// Sigil medium-sized between title and name. Card fully
// tinted with rank color. Most dramatic option.
// ═══════════════════════════════════════════════════════════
function CardVersionI() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ backgroundImage: "url(/images/ui/backgrounds/card-bg-1.png)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", aspectRatio: "800 / 448" }}
    >
      {/* Full rank color atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center top, ${SAMPLE.realmColor}18 0%, transparent 70%)`,
        }}
      />

      {/* Realm icon — massive faded background */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 opacity-[0.05] pointer-events-none">
        <Image
          unoptimized
          src={SAMPLE.realmIcon}
          alt=""
          width={280}
          height={280}
          className="select-none"
          draggable={false}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full py-5 px-5">
        {/* Title icon hero */}
        <div className="flex justify-center mb-1">
          <Image
            unoptimized
            src={SAMPLE.titleIcon}
            alt={SAMPLE.titleName}
            width={80}
            height={80}
            className="drop-shadow-lg"
          />
        </div>

        {/* Title name */}
        <div className="text-center mb-1">
          <span className="text-raider font-[family-name:var(--font-cinzel)] text-sm font-semibold tracking-wider uppercase">
            {SAMPLE.titleName}
          </span>
        </div>

        {/* Sigil + Name row */}
        <div className="flex items-center justify-center gap-3">
          <Image unoptimized src={SAMPLE.sigil} alt="sigil" width={44} height={44} className="drop-shadow-md" />
          <div className="text-center">
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl tracking-wide">
              {SAMPLE.name}
            </h3>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Image unoptimized src={SAMPLE.realmIcon} alt={SAMPLE.realmName} width={16} height={16} />
              <span className="text-gold font-[family-name:var(--font-cinzel)] text-xs font-semibold">
                {SAMPLE.realmName}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between w-[95%] mx-auto mt-3 mb-2">
          <span className="text-fire font-bold text-lg">
            {SAMPLE.weekPoints} <span className="text-sm font-normal">pts</span>
          </span>
          <span className="text-gold font-semibold text-sm">
            {SAMPLE.xp} XP
          </span>
        </div>

        <XPBar progress={SAMPLE.xpProgress} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PREVIEW PAGE
// ═══════════════════════════════════════════════════════════
export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <h1 className="font-[family-name:var(--font-cinzel)] text-foreground text-2xl font-bold text-center mb-2">
        Card Design Preview
      </h1>
      <p className="text-muted text-center text-sm mb-8">
        Title icon as hero — three ways to feature the sigil and rank
      </p>

      <div className="max-w-md mx-auto space-y-10">
        {/* Version D */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-gold font-[family-name:var(--font-cinzel)] font-bold text-sm">
              Version D
            </span>
            <span className="text-muted text-xs">&mdash; Title Watermark</span>
          </div>
          <p className="text-muted text-xs mb-3">Current banner layout (sigil hero top) + large faded title icon watermark behind content.</p>
          <CardVersionD />
        </section>

        {/* Version G */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-gold font-[family-name:var(--font-cinzel)] font-bold text-sm">
              Version G
            </span>
            <span className="text-muted text-xs">&mdash; Dual Watermark</span>
          </div>
          <p className="text-muted text-xs mb-3">Like D but with realm icon watermark top-left (200px) + title icon watermark right.</p>
          <CardVersionG />
        </section>

        {/* Version H */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-gold font-[family-name:var(--font-cinzel)] font-bold text-sm">
              Version H
            </span>
            <span className="text-muted text-xs">&mdash; Sigil Shield</span>
          </div>
          <p className="text-muted text-xs mb-3">Title icon layered over a larger faded sigil — creating a crest effect. Rank-colored border.</p>
          <CardVersionH />
        </section>

        {/* Version I */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-gold font-[family-name:var(--font-cinzel)] font-bold text-sm">
              Version I
            </span>
            <span className="text-muted text-xs">&mdash; Full Atmosphere</span>
          </div>
          <p className="text-muted text-xs mb-3">Realm icon massive background + radial rank glow. Title hero top. Sigil 44px beside name. Most dramatic.</p>
          <CardVersionI />
        </section>
      </div>
    </div>
  );
}
