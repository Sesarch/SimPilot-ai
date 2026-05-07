import { getTextContent, type MessageContent } from "@/hooks/useChat";
import ChatMessageContent from "@/components/ChatMessageContent";
import { stripReportFence } from "@/lib/checkrideReport";
import { stripGroundQuizFence } from "@/lib/groundQuiz";

/** Renders a user or assistant message, handling both plain text and multimodal content */
export function ChatBubbleContent({
  content,
  role,
}: {
  content: MessageContent;
  role: "user" | "assistant";
}) {
  if (role === "assistant") {
    return <ChatMessageContent content={stripReportFence(getTextContent(content))} />;
  }

  // User message — may contain images
  if (typeof content === "string") {
    return <>{content}</>;
  }

  return (
    <div className="space-y-2">
      {content.map((part, i) => {
        if (part.type === "text") return <p key={i} className="m-0">{part.text}</p>;
        if (part.type === "image_url") {
          return (
            <img
              key={i}
              src={part.image_url.url}
              alt="Uploaded chart"
              className="max-w-full rounded-md max-h-48 object-contain"
            />
          );
        }
        return null;
      })}
    </div>
  );
}
