import { Helmet } from "react-helmet-async";
import { resolveOgImage, resolveTwitterImage } from "@/lib/ogImages";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords: string;
  canonical?: string;
  ogType?: string;
  /** Optional explicit override. When omitted, the OG image is auto-resolved
   *  from the `canonical` path via src/lib/ogImages.ts, falling back to the
   *  default site image. */
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = "SimPilot.AI";
const BASE_URL = "https://simpilot.ai";

const SEOHead = ({
  title,
  description,
  keywords,
  canonical,
  ogType = "website",
  ogImage,
  noIndex = false,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;
  // Large variant (1200×630) → Open Graph (Facebook/LinkedIn/Slack/iMessage)
  const ogImageUrl = `${BASE_URL}${resolveOgImage(canonical, ogImage)}`;
  // Small variant (800×418) → Twitter/X summary_large_image
  const twitterImageUrl = `${BASE_URL}${resolveTwitterImage(canonical, ogImage)}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={twitterImageUrl} />
      <meta name="twitter:image:width" content="800" />
      <meta name="twitter:image:height" content="418" />
      <meta name="twitter:image:alt" content={fullTitle} />

      {jsonLd && (Array.isArray(jsonLd)
        ? jsonLd.map((ld, i) => (
            <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
          ))
        : <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
