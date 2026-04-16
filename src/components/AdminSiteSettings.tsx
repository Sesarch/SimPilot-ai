import { useState } from "react";
import { Settings, Bell, Wrench, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const AdminSiteSettings = () => {
  // These are local state for UI — in production you'd persist to a site_settings table
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [groundSchoolEnabled, setGroundSchoolEnabled] = useState(true);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [liveToolsEnabled, setLiveToolsEnabled] = useState(true);

  const handleSave = () => {
    toast.success("Settings saved (local state only — persistence coming soon)");
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" /> Site Settings
      </h2>

      <div className="space-y-6">
        {/* Maintenance Mode */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Temporarily disable the site for maintenance</p>
              </div>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>
        </div>

        {/* Site Announcement */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Site Announcement</p>
              <p className="text-xs text-muted-foreground">Display a banner across all pages</p>
            </div>
          </div>
          <Input
            placeholder="e.g., Scheduled maintenance on Saturday 10pm UTC"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
          />
        </div>

        {/* Feature Toggles */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Feature Toggles</p>
              <p className="text-xs text-muted-foreground">Enable or disable platform features</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: "User Signups", value: signupEnabled, set: setSignupEnabled },
              { label: "AI Chat", value: chatEnabled, set: setChatEnabled },
              { label: "Ground School", value: groundSchoolEnabled, set: setGroundSchoolEnabled },
              { label: "Weather Briefing", value: weatherEnabled, set: setWeatherEnabled },
              { label: "Live Sky Tools", value: liveToolsEnabled, set: setLiveToolsEnabled },
            ].map((toggle) => (
              <div key={toggle.label} className="flex items-center justify-between py-1">
                <span className="text-sm text-foreground">{toggle.label}</span>
                <Switch checked={toggle.value} onCheckedChange={toggle.set} />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default AdminSiteSettings;
