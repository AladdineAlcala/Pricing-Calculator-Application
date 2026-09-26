import React from "react";

export function BakeIQLogo({ className = "w-10 h-10 flex-shrink-0" }: { className?: string }) {
  return (
    <div className={className} title="BakeIQ - Bakery Intelligence">
      <svg className="w-full h-full drop-shadow-sm" fill="none" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="iconBg" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#241B15" />
            <stop offset="100%" stopColor="#140E0A" />
          </linearGradient>
          <linearGradient id="warmGrain" x1="0%" x2="100%" y1="100%" y2="0%">
            <stop offset="0%" stopColor="#C25E00" />
            <stop offset="60%" stopColor="#E58514" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="growthCurve" x1="0%" x2="50%" y1="100%" y2="0%">
            <stop offset="0%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        <rect fill="url(#iconBg)" height="464" rx="112" width="464" x="24" y="24" />
        <rect height="464" rx="112" stroke="#3E2C22" strokeWidth="6" width="464" x="24" y="24" />
        <circle cx="256" cy="256" r="170" stroke="#332218" strokeDasharray="6 14" strokeWidth="4" />
        <g>
          <path
            d="M 256 104 C 182 160 148 244 148 322 C 148 388 188 432 256 438 C 234 382 234 208 256 104 Z"
            fill="url(#warmGrain)"
          />
          <path
            d="M 256 104 C 278 208 278 382 256 438 C 324 432 364 388 364 322 C 364 240 330 156 256 104 Z"
            fill="url(#growthCurve)"
          />
          <line stroke="#1E1510" strokeLinecap="round" strokeWidth="14" x1="256" x2="256" y1="110" y2="432" />
          <line stroke="#1E1510" strokeLinecap="round" strokeWidth="10" x1="204" x2="240" y1="228" y2="228" />
          <line stroke="#1E1510" strokeLinecap="round" strokeWidth="10" x1="194" x2="240" y1="298" y2="298" />
          <line stroke="#1E1510" strokeLinecap="round" strokeWidth="10" x1="210" x2="240" y1="368" y2="368" />
          <circle cx="316" cy="216" fill="#FFFFFF" r="16" />
          <circle cx="316" cy="216" opacity="0.7" r="30" stroke="#22C55E" strokeWidth="5" />
          <path d="M 302 402 L 350 450" stroke="#F59E0B" strokeLinecap="round" strokeWidth="16" />
        </g>
      </svg>
    </div>
  );
}

export function BakeIQBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BakeIQLogo className={compact ? "w-8 h-8 flex-shrink-0" : "w-10 h-10 flex-shrink-0"} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-xl tracking-tight text-espresso-900 dark:text-white leading-none">
            Bake<span className="text-culinary-600 dark:text-emerald-400">IQ</span>
          </span>
          <span className="bg-caramel-100 text-caramel-700 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide border border-caramel-200 dark:border-amber-800/40">
            PRO
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-espresso-400 dark:text-slate-400 mt-1">
          Bakery Intelligence
        </span>
      </div>
    </div>
  );
}
