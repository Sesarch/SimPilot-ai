import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  maintenance_mode: boolean;
  announcement: string;
  signup_enabled: boolean;
  chat_enabled: boolean;
  ground_school_enabled: boolean;
  weather_enabled: boolean;
  live_tools_enabled: boolean;
  atc_live_frequency_enabled: boolean;
  atc_guided_scenarios_enabled: boolean;
  bridge_direct_download_enabled: boolean;
  google_site_verification: string;
  bing_site_verification: string;
  google_search_console_property_url: string;
};

const defaults: SiteSettings = {
  maintenance_mode: false,
  announcement: "",
  signup_enabled: true,
  chat_enabled: true,
  ground_school_enabled: true,
  weather_enabled: true,
  live_tools_enabled: true,
  atc_live_frequency_enabled: true,
  atc_guided_scenarios_enabled: true,
  bridge_direct_download_enabled: false,
  google_site_verification: "",
  bing_site_verification: "",
  google_search_console_property_url: "",
};

type Ctx = { settings: SiteSettings; loading: boolean };

const SiteSettingsContext = createContext<Ctx>({ settings: defaults, loading: true });

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const SiteSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applySettings = (data: Record<string, unknown>) => {
      setSettings({
        maintenance_mode: Boolean(data.maintenance_mode),
        announcement: typeof data.announcement === "string" ? data.announcement : "",
        signup_enabled: Boolean(data.signup_enabled),
        chat_enabled: Boolean(data.chat_enabled),
        ground_school_enabled: Boolean(data.ground_school_enabled),
        weather_enabled: Boolean(data.weather_enabled),
        live_tools_enabled: Boolean(data.live_tools_enabled),
        atc_live_frequency_enabled: data.atc_live_frequency_enabled === undefined ? true : Boolean(data.atc_live_frequency_enabled),
        atc_guided_scenarios_enabled: data.atc_guided_scenarios_enabled === undefined ? true : Boolean(data.atc_guided_scenarios_enabled),
        bridge_direct_download_enabled: Boolean(data.bridge_direct_download_enabled),
        google_site_verification: typeof data.google_site_verification === "string" ? data.google_site_verification : "",
        bing_site_verification: typeof data.bing_site_verification === "string" ? data.bing_site_verification : "",
        google_search_console_property_url: typeof data.google_search_console_property_url === "string" ? data.google_search_console_property_url : "",
      });
    };

    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) {
        applySettings(data as unknown as Record<string, unknown>);
      }
      setLoading(false);
    };

    const syncFromAdmin = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      if (detail) applySettings(detail);
    };

    window.addEventListener("simpilot:site-settings-updated", syncFromAdmin as EventListener);
    fetch();

    return () => {
      window.removeEventListener("simpilot:site-settings-updated", syncFromAdmin as EventListener);
    };
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
