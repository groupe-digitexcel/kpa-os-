// Controls which storage backend lib/actions/*.ts writes to.
// Set DATA_MODE=local in the Tauri-bundled server's environment.
// Defaults to "cloud" so the existing Vercel/web deployment is unaffected.
export function isLocalMode() {
  return process.env.DATA_MODE === "local";
}
