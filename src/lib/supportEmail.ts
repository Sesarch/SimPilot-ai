// Centralized support email address.
// Configure via the VITE_SUPPORT_EMAIL environment variable.
// Note: Vite env vars are baked into the bundle at build time, so changes
// require a redeploy to take effect on the frontend.
export const SUPPORT_EMAIL: string =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? "support@simpilot.ai";
