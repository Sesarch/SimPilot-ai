import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, BookOpen, Target } from "lucide-react";

function splitSources(content: string): { main: string; sources: string | null } {
  // Match a horizontal rule followed by the Sources header
  const pattern = /\n---\n\s*📚\s*\*{0,2}Sources\*{0,2}/i;
  const match = content.match(pattern);
  if (!match || match.index === undefined) return { main: content, sources: null };
  const main = content.slice(0, match.index).trimEnd();
  const sourcesStart = match.index + match[0].length;
  const sources = content.slice(sourcesStart).trim();
  return { main, sources };
}

function splitTakeaway(content: string): { takeaway: string | null; rest: string } {
  // Match a leading blockquote with "Key takeaway" (with optional 🎯 emoji and bold markers)
  // Supports multi-line blockquotes (consecutive lines starting with ">")
  const trimmed = content.replace(/^\s+/, "");
  const pattern = /^>\s*(?:🎯\s*)?\*{0,2}Key takeaway:?\*{0,2}\s*([\s\S]*?)(?:\n(?!>)|$)/i;
  const match = trimmed.match(pattern);
  if (!match) return { takeaway: null, rest: content };

  // Extract all leading blockquote lines as the takeaway body
  const lines = trimmed.split("\n");
  const quoteLines: string[] = [];
  let i = 0;
  while (i < lines.length && /^\s*>/.test(lines[i])) {
    quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
    i++;
  }
  let body = quoteLines.join(" ").trim();
  // Strip the "Key takeaway:" prefix
  body = body.replace(/^(?:🎯\s*)?\*{0,2}Key takeaway:?\*{0,2}\s*/i, "").trim();
  if (!body) return { takeaway: null, rest: content };

  const rest = lines.slice(i).join("\n").replace(/^\s+/, "");
  return { takeaway: body, rest };
}

export default function ChatMessageContent({ content }: { content: string }) {
  const { main, sources } = splitSources(content);
  const { takeaway, rest } = splitTakeaway(main);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <>
      {takeaway && (
        <div className="mb-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 flex gap-2">
          <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-display font-semibold tracking-widest uppercase text-primary mb-0.5">
              Key takeaway
            </p>
            <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&_p]:m-0 [&_p]:text-xs [&_p]:leading-snug">
              <ReactMarkdown>{takeaway}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
      <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:mt-1 [&_ol]:mt-1">
        <ReactMarkdown>{rest}</ReactMarkdown>
      </div>
      {sources && (
        <button
          type="button"
          onClick={() => setSourcesOpen((o) => !o)}
          className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors w-full"
        >
          <BookOpen className="w-3 h-3" />
          <span>Sources</span>
          {sourcesOpen ? (
            <ChevronDown className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronRight className="w-3 h-3 ml-auto" />
          )}
        </button>
      )}
      {sources && sourcesOpen && (
        <div className="mt-1 text-[10px] text-muted-foreground prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-3 [&_li]:m-0 [&_li]:leading-relaxed">
          <ReactMarkdown>{sources}</ReactMarkdown>
        </div>
      )}
    </>
  );
}
