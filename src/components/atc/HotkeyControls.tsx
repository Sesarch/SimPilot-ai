import { useEffect } from "react";

/** Captures the next keyboard event and reports its KeyboardEvent.code.
 *  Modifier-only presses are rejected (useless as a solo PTT key). */
export const HotkeyCapture = ({ onCapture, onCancel }: { onCapture: (code: string) => void; onCancel: () => void }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") { onCancel(); return; }
      if (["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(e.code)) return;
      onCapture(e.code);
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true } as unknown as EventListenerOptions);
  }, [onCapture, onCancel]);
  return null;
};

/** Press-and-hold PTT bound to a single KeyboardEvent.code, suppressed while
 *  the user is typing into an input/textarea/contenteditable. */
export const HotkeyPTT = ({ onDown, onUp, disabled, hotkey }: { onDown: () => void; onUp: () => void; disabled: boolean; hotkey: string }) => {
  useEffect(() => {
    if (!hotkey) return;
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (e.code !== hotkey || e.repeat || disabled || isTyping(e.target)) return;
      e.preventDefault();
      onDown();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== hotkey || isTyping(e.target)) return;
      e.preventDefault();
      onUp();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onDown, onUp, disabled, hotkey]);
  return null;
};
