"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Pisos + mapa" },
  { href: "/add", label: "Añadir piso" },
  { href: "/marcador", label: "Marcador" },
  { href: "/settings", label: "Ajustes" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-950">
      <Link href="/" className="mr-4 font-black tracking-tight">
        CAMPUS<span className="text-orange-700">RENT</span>
      </Link>
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1 text-sm ${active ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </header>
  );
}
