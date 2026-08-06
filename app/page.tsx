import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-kpa-navy text-white p-6 text-center">
      <img
        src="/logo-placeholder.png"
        alt="Kingdom Passion Academy"
        className="w-20 h-20 mb-4 rounded-full bg-white/10"
      />
      <h1 className="text-2xl font-bold text-kpa-gold">Kingdom Passion Academy</h1>
      <p className="text-sm text-white/70 mb-6">School Operations System — Douala PK17</p>
      <Link
        href="/login"
        className="bg-kpa-gold text-kpa-navy font-semibold px-6 py-3 rounded-lg hover:opacity-90"
      >
        Se connecter / Login
      </Link>
    </main>
  );
}
