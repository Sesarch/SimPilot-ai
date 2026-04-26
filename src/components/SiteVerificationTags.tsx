import { Helmet } from "react-helmet-async";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Injects search-engine site verification meta tags (Google Search Console,
 * Bing Webmaster) site-wide. Tokens are managed by admins under
 * Admin → SEO and persisted in `site_settings`.
 *
 * Only the token portion is accepted (e.g. the `content` value Google gives
 * you). Empty values render nothing so we never emit `<meta content="">`.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_\-]{10,200}$/;

const SiteVerificationTags = () => {
  const { settings } = useSiteSettings();

  const google = settings.google_site_verification?.trim() ?? "";
  const bing = settings.bing_site_verification?.trim() ?? "";

  return (
    <Helmet>
      {TOKEN_PATTERN.test(google) && (
        <meta name="google-site-verification" content={google} />
      )}
      {TOKEN_PATTERN.test(bing) && (
        <meta name="msvalidate.01" content={bing} />
      )}
    </Helmet>
  );
};

export default SiteVerificationTags;
