import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function usePOHUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File) => {
    const folder = user?.id ?? "anonymous";
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${folder}/${Date.now()}.${ext}`;

    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from("poh-files")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      toast.success("POH uploaded successfully! It will be used to personalise your answers.");
    } catch (err: any) {
      console.error("POH upload failed:", err);
      toast.error("Failed to upload POH. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [user]);

  return { upload, uploading };
}
