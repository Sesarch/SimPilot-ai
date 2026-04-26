import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldAlert, ScrollText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TermsAgreementProps {
  agreed: boolean;
  onAgreeChange: (agreed: boolean) => void;
}

const TERMS_SUMMARY = [
  "SimPilot.AI is NOT FAA-approved and is intended for unofficial, supplemental study purposes only.",
  "You must receive all required training from certificated flight instructors (CFI/CFII) and FAA-approved flight schools.",
  "AI-generated responses may contain errors. Always verify information against official FAA publications (AIM, FAR/AIM, POH).",
  "SimPilot.AI assumes no liability for flight safety, checkride outcomes, or any decisions made based on information provided.",
  "Your use of this platform does not constitute official ground school or flight training of any kind.",
  "You are solely responsible for ensuring your training meets all FAA regulatory requirements.",
  "By creating an account, you acknowledge that this tool is a study aid and not a substitute for professional instruction.",
];

const TermsAgreement = ({ agreed, onAgreeChange }: TermsAgreementProps) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    if (atBottom) setHasScrolledToBottom(true);
  }, []);

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      setShowConfirmDialog(true);
    } else {
      onAgreeChange(false);
    }
  };

  const handleConfirm = () => {
    onAgreeChange(true);
    setShowConfirmDialog(false);
  };

  return (
    <div className="space-y-3">
      {/* Large warning banner */}
      <div className="bg-destructive/15 border-2 border-destructive/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
          <h3 className="text-sm font-bold text-destructive uppercase tracking-wider">
            Important Legal Disclaimer
          </h3>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <ScrollText className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Read all terms below to enable the agreement checkbox
          </p>
        </div>

        {/* Scrollable terms summary */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[140px] overflow-y-auto rounded-lg bg-background/50 border border-border p-3 space-y-2 mb-3 scrollbar-thin"
        >
          {TERMS_SUMMARY.map((term, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">{term}</p>
            </div>
          ))}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground text-center italic">
              — End of terms summary —
            </p>
          </div>
        </div>

        {!hasScrolledToBottom && (
          <p className="text-[11px] text-destructive/80 text-center animate-pulse mb-2">
            ↓ Scroll down to read all terms before agreeing ↓
          </p>
        )}

        {/* Checkbox */}
        <label
          className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
            hasScrolledToBottom
              ? "cursor-pointer hover:bg-primary/5"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          <Checkbox
            checked={agreed}
            onCheckedChange={(checked) => handleCheckboxChange(checked === true)}
            disabled={!hasScrolledToBottom}
            className="mt-0.5"
          />
          <span className="text-xs text-foreground font-medium leading-relaxed">
            I have read, understood, and agree to the{" "}
            <Link
              to="/terms"
              target="_blank"
              className="text-primary hover:underline font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              target="_blank"
              className="text-primary hover:underline font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </Link>
            , including the disclaimer that this is{" "}
            <strong className="text-destructive">
              NOT official flight training
            </strong>
            .
          </span>
        </label>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Confirm Agreement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-3">
              <p>By confirming, you acknowledge and agree that:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  SimPilot.AI is <strong className="text-destructive">NOT FAA-approved</strong>
                </li>
                <li>This is supplemental study only, not official training</li>
                <li>You will obtain training from certificated instructors</li>
                <li>AI responses may contain errors and must be verified</li>
                <li>
                  You have read the{" "}
                  <Link to="/terms" target="_blank" title="Open SimPilot.AI Terms & Conditions in a new tab" className="text-primary hover:underline">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" title="Open SimPilot.AI Privacy Policy in a new tab" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              I Understand & Agree
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TermsAgreement;
