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
};

const defaults: SiteSettings = {
  maintenance_mode: false,
  announcement: "",
  signup_enabled: true,
  chat_enabled: true,
  ground_school_enabled: true,
  weather_enabled: true,
  live_tools_enabled: true,
};

type Ctx = { settings: SiteSettings; loading: boolean };

const SiteSettingsContext = createContext<Ctx>({ settings: defaults, loading: true });

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const SiteSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) {
        setSettings({
          maintenance_mode: data.maintenance_mode,
          announcement: data.announcement,
          signup_enabled: data.signup_enabled,
          chat_enabled: data.chat_enabled,
          ground_school_enabled: data.ground_school_enabled,
          weather_enabled: data.weather_enabled,
          live_tools_enabled: data.live_tools_enabled,
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
