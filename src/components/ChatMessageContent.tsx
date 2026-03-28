import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";

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

export default function ChatMessageContent({ content }: { content: string }) {
  const { main, sources } = splitSources(content);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <>
      <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:mt-1 [&_ol]:mt-1">
        <ReactMarkdown>{main}</ReactMarkdown>
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
