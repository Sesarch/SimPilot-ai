import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

interface ExamPassCelebrationProps {
  show: boolean;
  score: number;
  total: number;
  onDismiss: () => void;
}

const CONFETTI_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(45 100% 60%)",
  "hsl(120 60% 50%)",
  "hsl(200 80% 60%)",
];

function ConfettiPiece({ index }: { index: number }) {
  const left = Math.random() * 100;
  const delay = Math.random() * 0.8;
  const duration = 1.5 + Math.random() * 1.5;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 6 + Math.random() * 6;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      className="absolute top-0 rounded-sm"
      style={{
        left: `${left}%`,
        width: size,
        height: size * 0.6,
        backgroundColor: color,
      }}
      initial={{ y: -20, opacity: 1, rotate: rotation }}
      animate={{
        y: "100vh",
        opacity: [1, 1, 0],
        rotate: rotation + 360 + Math.random() * 360,
        x: (Math.random() - 0.5) * 200,
      }}
      transition={{
        duration,
        delay,
        ease: "easeIn",
      }}
    />
  );
}

export default function ExamPassCelebration({
  show,
  score,
  total,
  onDismiss,
}: ExamPassCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Confetti */}
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}

          {/* Central badge */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-auto"
            onClick={onDismiss}
          >
            <motion.div
              className="flex flex-col items-center gap-3 bg-background/95 backdrop-blur-sm border border-primary/40 rounded-2xl px-8 py-6 shadow-[0_0_40px_hsl(var(--primary)/0.25)]"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, delay: 0.2 }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
              </motion.div>
              <p className="font-display text-xs font-bold tracking-[0.2em] uppercase text-primary">
                Exam Passed
              </p>
              <p className="text-2xl font-bold text-foreground">
                {score}/{total}
              </p>
              <p className="text-muted-foreground text-xs">Tap to dismiss</p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
