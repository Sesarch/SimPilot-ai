import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import {
  PINNED_BRIDGE_VERSION,
  resolveBridgeRelease,
  validateResolvedRelease,
  type ResolvedBridgeRelease,
} from "@/lib/bridgeDownload";

/**
 * Compact "Verified installer status" panel surfaced on the Home page and the
 * /flight-deck/bridge setup page. It runs the same release resolver +
 * validator the download button uses, so the user can see — at a glance —
 * that the live release matches the pinned v1.0.1 build, the asset filename
 * is the expected installer, and the URL is hosted on a trusted GitHub host.
 */
type Props = {
  className?: string;
};

type PanelState =
  | { status: "loading" }
  | { status: "ok"; release: ResolvedBridgeRelease; host: string }
  | { status: "error"; title: string; message: string };

const BridgeVerifiedStatusPanel = ({ className }: Props) => {
  const [state, setState] = useState<PanelState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const release = await resolveBridgeRelease();
        if (cancelled) return;
        const validation = validateResolvedRelease(release);
        if (validation.ok !== true) {
          setState({ status: "error", title: validation.title, message: validation.message });
          return;
        }
        const host = (() => {
          try {
            return new URL(release!.installer!.downloadUrl).hostname;
          } catch {
            return "unknown";
          }
        })();
        setState({ status: "ok", release: release!, host });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          title: "Status unavailable",
          message: (err as Error).message || "Could not reach the release server.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const base =
    "rounded-lg border bg-card/60 backdrop-blur-sm p-4 text-sm shadow-sm " +
    (className ?? "");

  if (state.status === "loading") {
    return (
      <div className={`${base} border-border`} aria-live="polite">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="font-display text-[12px] tracking-[0.2em] uppercase">
            Verifying installer status…
          </span>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={`${base} border-destructive/40 bg-destructive/5`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive" aria-hidden />
          <div className="space-y-0.5">
            <p className="font-display text-[12px] tracking-[0.18em] uppercase text-destructive">
              {state.title}
            </p>
            <p className="text-xs text-muted-foreground">{state.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const { release, host } = state;
  const versionMatch = release.tagName === `v${PINNED_BRIDGE_VERSION}`;
  return (
    <div
      className={`${base} border-primary/30 bg-primary/5`}
      role="status"
      aria-live="polite"
      data-testid="bridge-verified-status-panel"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" aria-hidden />
        <div className="flex-1 space-y-1.5">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase text-primary">
            Verified Installer Status
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-mono text-foreground">
              {release.tagName}{" "}
              <span
                className={
                  versionMatch
                    ? "text-primary"
                    : "text-destructive"
                }
              >
                {versionMatch ? `· matches v${PINNED_BRIDGE_VERSION} ✓` : `· expected v${PINNED_BRIDGE_VERSION}`}
              </span>
            </dd>
            <dt className="text-muted-foreground">Asset</dt>
            <dd className="font-mono text-foreground break-all">
              {release.installer?.name ?? "—"}
            </dd>
            <dt className="text-muted-foreground">Host</dt>
            <dd className="font-mono text-foreground">{host}</dd>
            <dt className="text-muted-foreground">Checksum</dt>
            <dd className="text-foreground">
              {release.sha512 ? (
                <span className="text-primary">SHA-512 published ✓</span>
              ) : (
                <span className="text-muted-foreground">unavailable</span>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default BridgeVerifiedStatusPanel;
