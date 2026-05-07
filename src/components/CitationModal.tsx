import { ExternalLink, BookMarked } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { citationFullName, citationIcon, type ParsedCitation } from "@/lib/citations";
import { citationResource, citationNumber } from "@/lib/citationLinks";
import { cn } from "@/lib/utils";

interface CitationModalProps {
  citation: ParsedCitation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: the explanation prose this citation appeared in (gives extra context). */
  context?: string;
}

export function CitationModal({ citation, open, onOpenChange, context }: CitationModalProps) {
  if (!citation) return null;
  const Icon = citationIcon(citation.kind);
  const resource = citationResource(citation);
  const num = citationNumber(citation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              aria-hidden="true"
              className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary"
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[10px] tracking-[0.25em] uppercase text-primary">
                {citation.kind} Reference
              </p>
              <DialogTitle className="font-display text-base text-foreground truncate">
                {citationFullName(citation.kind)}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription asChild>
            <div className="space-y-3 text-left">
              <div
                className={cn(
                  "inline-flex items-stretch rounded-md border overflow-hidden font-mono text-xs leading-none",
                  "border-primary/40 bg-background/70 text-foreground",
                )}
              >
                <span className="flex items-center gap-1 px-2 py-1.5 bg-primary/15 text-primary border-r border-primary/30 font-display tracking-widest text-[10px] uppercase">
                  {citation.kind}
                </span>
                <span className="px-2.5 py-1.5 font-medium">{num || citation.label}</span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{resource.summary}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {resource.highlights && resource.highlights.length > 0 && (
          <div className="rounded-lg border border-border/70 bg-background/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BookMarked className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <p className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                Typical contents
              </p>
            </div>
            <ul className="space-y-1.5">
              {resource.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-xs text-foreground/85">
                  <span aria-hidden="true" className="mt-1 w-1 h-1 rounded-full bg-primary shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {context && (
          <div className="rounded-lg border border-accent/30 bg-accent/[0.06] p-3">
            <p className="font-display text-[9px] tracking-[0.25em] uppercase text-accent mb-1.5">
              Why this was cited
            </p>
            <p className="text-xs text-foreground/85 leading-relaxed">{context}</p>
          </div>
        )}

        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs tracking-widest uppercase hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.35)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Open on {resource.source}
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </DialogContent>
    </Dialog>
  );
}

export default CitationModal;
