import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const label =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  const icon = !mounted ? (
    <Monitor size={18} />
  ) : resolvedTheme === "dark" ? (
    <Moon size={18} />
  ) : theme === "light" ? (
    <Sun size={18} />
  ) : (
    <Monitor size={18} />
  );

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1.5 p-2 rounded-md text-muted-foreground hover:text-primary transition-colors duration-300"
      aria-label={`Theme: ${label}. Click to switch.`}
      title={`Theme: ${label}`}
    >
      {icon}
      <span className="text-xs uppercase tracking-wide">
        {label}
      </span>
    </button>
  );
};

export default ThemeToggle;
