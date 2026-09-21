/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Keep the native SQLite addon out of browser/client bundles. The addon is
  // used only by the Tauri/local-server runtime.
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};
module.exports = nextConfig;
