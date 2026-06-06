import ReactMarkdown from "react-markdown";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Radio, MessageSquare } from "lucide-react";
import type { ATCLesson } from "@/hooks/useATCData";

const ATCLessonAccordion = ({ lessons }: { lessons: ATCLesson[] }) => {
  if (lessons.length === 0) {
    return <p className="text-sm text-muted-foreground">No lessons yet.</p>;
  }
  return (
    <Accordion type="multiple" className="space-y-2">
      {lessons.map((lesson) => (
        <AccordionItem
          key={lesson.id}
          value={lesson.id}
          className="border border-border rounded-lg bg-card/40 px-3 sm:px-4"
        >
          <AccordionTrigger className="text-left font-display text-sm sm:text-base uppercase tracking-wider hover:no-underline">
            {lesson.title}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="prose prose-sm prose-invert max-w-none text-foreground">
              <ReactMarkdown>{lesson.content_markdown}</ReactMarkdown>
            </div>

            {lesson.example_transmission && (
              <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Radio className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] uppercase tracking-wider font-display text-accent">
                    Controller
                  </span>
                </div>
                <p className="text-sm text-foreground font-mono leading-relaxed">
                  {lesson.example_transmission}
                </p>
              </div>
            )}

            {lesson.example_response && (
              <div className="rounded-md border border-[hsl(var(--hud-green,142_70%_45%))]/30 bg-[hsl(var(--hud-green,142_70%_45%))]/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[hsl(var(--hud-green,142_70%_45%))]" />
                  <span className="text-[10px] uppercase tracking-wider font-display text-[hsl(var(--hud-green,142_70%_45%))]">
                    Pilot
                  </span>
                </div>
                <p className="text-sm text-foreground font-mono leading-relaxed">
                  {lesson.example_response}
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default ATCLessonAccordion;
