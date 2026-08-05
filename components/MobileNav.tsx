"use client";

import { useState } from "react";

type NavItem = { label: string; href: string };

export default function MobileNav({
  nav,
  schoolName,
  role,
  fullName,
}: {
  nav: NavItem[];
  schoolName: string;
  role: string;
  fullName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar — visible only below md breakpoint */}
      <div className="md:hidden sticky top-0 z-40 bg-kpa-navy text-white flex items-center justify-between px-4 py-3 shadow-md">
        <div>
          <p className="font-bold text-kpa-gold text-sm leading-tight">{schoolName}</p>
          <p className="text-[11px] text-white/60 capitalize">{role}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10"
        >
          <span className="block w-5 space-y-1">
            <span className="block h-0.5 bg-white rounded"></span>
            <span className="block h-0.5 bg-white rounded"></span>
            <span className="block h-0.5 bg-white rounded"></span>
          </span>
        </button>
      </div>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
          <div className="w-72 max-w-[80vw] bg-kpa-navy text-white p-5 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-bold text-kpa-gold text-base leading-tight">{schoolName}</p>
                <p className="text-xs text-white/60 capitalize">{role}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-lg"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-1 text-sm">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg hover:bg-white/10 active:bg-white/15 transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {fullName && <div className="text-xs text-white/50 mt-auto pt-6">{fullName}</div>}
          </div>
        </div>
      )}
    </>
  );
}
