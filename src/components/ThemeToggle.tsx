import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const label =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1.5 p-2 rounded-md text-muted-foreground hover:text-primary transition-colors duration-300"
      aria-label={`Theme: ${label}. Click to switch.`}
      title={`Theme: ${label}`}
    >
      {theme === "dark" ? (
        <Moon size={18} />
      ) : theme === "light" ? (
        <Sun size={18} />
      ) : (
        <Monitor size={18} />
      )}
      <span className="text-xs font-medium uppercase tracking-wide hidden sm:inline">
        {label}
      </span>
    </button>
  );
};

export default ThemeToggle;
