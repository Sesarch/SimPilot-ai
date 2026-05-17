import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ScrollText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import TermsContent from "@/components/legal/TermsContent";
import { TERMS_VERSION } from "@/lib/termsVersion";

interface TermsAgreementProps {
  agreed: boolean;
  onAgreeChange: (agreed: boolean) => void;
}

/**
 * Scroll-gated full Terms acceptance.
 *
 * Renders the COMPLETE T&C body (not a summary) inside a scrollable
 * container. The agreement checkbox stays disabled until the user
 * scrolls to the bottom. This is the standard "anti-clickwrap"
 * practice that materially improves enforceability.
 */
const TermsAgreement = ({ agreed, onAgreeChange }: TermsAgreementProps) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (atBottom) setHasScrolledToBottom(true);
  }, []);

  return (
    <div className="space-y-3">
      <div className="bg-destructive/15 border-2 border-destructive/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
          <h3 className="text-sm text-destructive uppercase tracking-wider">
            Terms & Conditions — full text
          </h3>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <ScrollText className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Scroll to the bottom to enable the agreement checkbox
          </p>
        </div>

        {/* Full T&C — scrollable */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[320px] overflow-y-auto rounded-lg bg-background/60 border border-border p-4 mb-3 scrollbar-thin"
        >
          <TermsContent />
          <div className="pt-3 mt-3 border-t border-border text-center">
            <p className="text-xs text-muted-foreground italic">— End of Terms —</p>
          </div>
        </div>

        {!hasScrolledToBottom && (
          <p className="text-[11px] text-destructive/80 text-center animate-pulse mb-2">
            ↓ Scroll to the bottom to enable the agreement checkbox ↓
          </p>
        )}

        <label
          className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
            hasScrolledToBottom
              ? "cursor-pointer hover:bg-primary/5"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          <Checkbox
            checked={agreed}
            onCheckedChange={(checked) => onAgreeChange(checked === true)}
            disabled={!hasScrolledToBottom}
            className="mt-0.5"
          />
          <span className="text-xs text-foreground leading-relaxed">
            I have read and agree to the{" "}
            <Link to="/terms" target="_blank" className="text-primary hover:underline">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            , including the disclaimer that this is{" "}
            <strong className="text-destructive">NOT official flight training</strong>.
          </span>
        </label>

        <p className="text-[10px] text-muted-foreground/70 mt-2 text-center">
          You are accepting Terms version <code>{TERMS_VERSION}</code>.
        </p>
      </div>
    </div>
  );
};

export default TermsAgreement;
