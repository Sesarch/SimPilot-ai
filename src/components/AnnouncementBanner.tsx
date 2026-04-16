import { useSiteSettings } from "@/hooks/useSiteSettings";
import { AlertTriangle } from "lucide-react";

const AnnouncementBanner = () => {
  const { settings } = useSiteSettings();

  if (!settings.announcement) return null;

  return (
    <div className="bg-primary/90 text-primary-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 z-50">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{settings.announcement}</span>
    </div>
  );
};

export default AnnouncementBanner;
