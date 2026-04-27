import { useState, useEffect } from "react";
import { Settings, Bell, Wrench, Globe, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getBridgeDirectDownloadEnabled,
  setBridgeDirectDownloadEnabled,
} from "@/lib/bridgeDownloadMode";

const AdminSiteSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [groundSchoolEnabled, setGroundSchoolEnabled] = useState(true);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [liveToolsEnabled, setLiveToolsEnabled] = useState(true);
  const [atcLiveFreqEnabled, setAtcLiveFreqEnabled] = useState(true);
  const [atcGuidedScenariosEnabled, setAtcGuidedScenariosEnabled] = useState(true);
  const [bridgeDirectDownload, setBridgeDirectDownload] = useState(false);

  const handleBridgeDirectDownloadChange = (next: boolean) => {
    setBridgeDirectDownload(next);
    toast.info(
      next
        ? "Mac and Linux direct downloads will go live after you save settings"
        : "Mac and Linux buttons will switch back to the GitHub release page after you save settings",
    );
  };

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (data && !error) {
        setMaintenanceMode(data.maintenance_mode);
        setAnnouncement(data.announcement);
        setSignupEnabled(data.signup_enabled);
        setChatEnabled(data.chat_enabled);
        setGroundSchoolEnabled(data.ground_school_enabled);
        setWeatherEnabled(data.weather_enabled);
        setLiveToolsEnabled(data.live_tools_enabled);
        const d = data as Record<string, unknown>;
        setAtcLiveFreqEnabled(d.atc_live_frequency_enabled === undefined ? true : Boolean(d.atc_live_frequency_enabled));
        setAtcGuidedScenariosEnabled(d.atc_guided_scenarios_enabled === undefined ? true : Boolean(d.atc_guided_scenarios_enabled));
        setBridgeDirectDownload(Boolean((data as { bridge_direct_download_enabled?: boolean }).bridge_direct_download_enabled));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const nextSettings = {
      maintenance_mode: maintenanceMode,
      announcement,
      signup_enabled: signupEnabled,
      chat_enabled: chatEnabled,
      ground_school_enabled: groundSchoolEnabled,
      weather_enabled: weatherEnabled,
      live_tools_enabled: liveToolsEnabled,
      atc_live_frequency_enabled: atcLiveFreqEnabled,
      atc_guided_scenarios_enabled: atcGuidedScenariosEnabled,
      bridge_direct_download_enabled: bridgeDirectDownload,
    };
    const { error } = await supabase
      .from("site_settings")
      .update(nextSettings)
      .eq("id", 1);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      setBridgeDirectDownloadEnabled(bridgeDirectDownload);
      window.dispatchEvent(new CustomEvent("simpilot:site-settings-updated", { detail: nextSettings }));
      toast.success("Settings saved successfully");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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

        {/* Bridge Download Mode */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Bridge: Mac/Linux direct downloads</p>
                <p className="text-xs text-muted-foreground">
                  Off → buttons open the GitHub release page. On → buttons download the .dmg / .AppImage
                  directly. Only flip on once those assets are published to the pinned release.
                </p>
              </div>
            </div>
            <Switch checked={bridgeDirectDownload} onCheckedChange={handleBridgeDirectDownloadChange} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default AdminSiteSettings;
