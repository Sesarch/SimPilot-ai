import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pre-publish draft banner. Visible ONLY to authenticated admin users
 * (checked against the `user_roles` table). Public visitors never see it.
 */
interface DraftReviewBannerProps {
  title?: string;
  body: string;
  flagItems?: string[];
}

export const DraftReviewBanner = ({
  title = "DRAFT — PENDING ATTORNEY REVIEW",
  body,
  flagItems,
}: DraftReviewBannerProps) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled && data) setIsAdmin(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border-2 border-yellow-500/60 bg-yellow-500/10 p-4 text-yellow-100"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-2 text-sm">
          <p className="font-display tracking-widest uppercase text-xs text-yellow-300">
            ⚠️ {title}
          </p>
          <p className="text-yellow-50/90 leading-relaxed">{body}</p>
          {flagItems && flagItems.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-yellow-100/80 space-y-0.5">
              {flagItems.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-yellow-200/70 italic">
            Visible only to admins. Hidden from public visitors.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DraftReviewBanner;
