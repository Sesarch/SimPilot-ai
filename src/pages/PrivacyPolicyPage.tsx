import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PRIVACY_LAST_UPDATED = "June 6, 2026";
const PRIVACY_VERSION = "2026-06-06";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy — SimPilot.ai"
        description="How SimPilot.ai collects, uses, and protects your personal data. GDPR, CCPA/CPRA compliance, subprocessors, retention, and your rights."
        keywords="SimPilot.ai privacy policy, pilot training data privacy, GDPR, CCPA, aviation training data protection, AI chat privacy"
        canonical="/privacy"
        ogImage="/og-privacy.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Privacy Policy — SimPilot.ai",
          "description": "How SimPilot.ai collects, uses, and protects your personal data.",
          "url": "https://simpilot.ai/privacy",
          "inLanguage": "en-US",
          "isPartOf": { "@type": "WebSite", "name": "SimPilot.ai", "url": "https://simpilot.ai" },
          "about": { "@type": "Thing", "name": "Privacy Policy" },
          "publisher": { "@type": "Organization", "name": "SimPilot.ai", "url": "https://simpilot.ai" }
        }}
      />
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 py-12 pt-24 max-w-3xl">
        <h1 className="font-display text-3xl text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-1">Last updated: {PRIVACY_LAST_UPDATED}</p>
        <p className="text-xs text-muted-foreground/70 mb-8">Version <code>{PRIVACY_VERSION}</code></p>

        <div className="prose prose-sm prose-invert max-w-none space-y-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-sm [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-secondary-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-secondary-foreground [&_li]:text-sm [&_strong]:text-foreground">

          <p>
            This Privacy Policy explains how SimPilot.ai ("we," "us," "our") collects, uses, stores, and protects your personal information when you use our Service at <a href="https://simpilot.ai" className="text-primary hover:underline">https://simpilot.ai</a>. We are committed to protecting your privacy and complying with applicable privacy laws including GDPR (EU/UK), CCPA/CPRA (California), and equivalent laws worldwide.
          </p>
          <p>
            Questions or rights requests: <strong className="text-primary">privacy@simpilot.ai</strong>
          </p>

          <h2>1. Who We Are</h2>
          <p>
            SimPilot.ai operates an AI-powered supplemental pilot training platform. We are the data controller for personal data collected through the Service. We are based in the United States.
          </p>

          <h2>2. Data We Collect</h2>

          <h3>2.1 Account Data</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Name and email address</li>
            <li>Password (stored as a cryptographic hash — never in plain text)</li>
            <li>Certificate goal (e.g., Private Pilot, Instrument Rating)</li>
            <li>Target checkride date, training aircraft, and current flight hours</li>
            <li>Google OAuth profile data if you sign in with Google (name, email, profile picture)</li>
          </ul>

          <h3>2.2 Training & Activity Data</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Quiz attempts, answers, and scores</li>
            <li>Lesson progress and completion status</li>
            <li>Oral coach session transcripts (text only)</li>
            <li>Mock checkride evaluation results</li>
            <li>Scenario decisions and outcomes</li>
            <li>ATC session transcripts (text only — see Section 4 for audio policy)</li>
            <li>Chart tutor interactions</li>
            <li>Logbook entries and flight currency data</li>
            <li>Knowledge graph mastery scores and recommendations</li>
          </ul>

          <h3>2.3 Billing Data</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Subscription plan and status</li>
            <li>Billing history and invoices</li>
          </ul>
          <p>
            <strong>Important:</strong> Card numbers, CVV, and full payment details are handled directly by Stripe, Inc. We never see, transmit, or store raw payment card data.
          </p>

          <h3>2.4 Technical & Usage Data</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>IP address (recorded with consent log entries; otherwise hashed for rate limiting only)</li>
            <li>Browser type, version, and device type</li>
            <li>Pages visited, features used, and time spent</li>
            <li>Error logs and performance metrics</li>
            <li>Session identifiers and authentication tokens</li>
          </ul>

          <h3>2.5 Consent Records</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Document versions (Terms, Privacy Policy, Aviation Disclaimer) you accepted</li>
            <li>Timestamp, IP address, and user agent at time of acceptance</li>
            <li>Method of acceptance (signup or re-acceptance modal)</li>
          </ul>

          <h3>2.6 Support Data</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Emails, support tickets, and messages you send us</li>
            <li>Information you voluntarily provide when reporting issues</li>
          </ul>

          <h2>3. Why We Collect It (Lawful Basis)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-2 border-b border-border">Legal Basis</th>
                  <th className="text-left p-2 border-b border-border">Purpose</th>
                  <th className="text-left p-2 border-b border-border">Data Categories</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b border-border align-top"><strong>Contract performance</strong></td>
                  <td className="p-2 border-b border-border align-top">Deliver the Service you subscribed to; process payments; provide training features</td>
                  <td className="p-2 border-b border-border align-top">Account, Training, Billing</td>
                </tr>
                <tr>
                  <td className="p-2 border-b border-border align-top"><strong>Legitimate interest</strong></td>
                  <td className="p-2 border-b border-border align-top">Security and fraud prevention; product improvement; aggregate analytics; abuse detection; cost monitoring</td>
                  <td className="p-2 border-b border-border align-top">Technical, Usage</td>
                </tr>
                <tr>
                  <td className="p-2 border-b border-border align-top"><strong>Legal obligation</strong></td>
                  <td className="p-2 border-b border-border align-top">Tax records; respond to lawful government requests; maintain consent audit trail</td>
                  <td className="p-2 border-b border-border align-top">Billing, Consent Records</td>
                </tr>
                <tr>
                  <td className="p-2 align-top"><strong>Consent</strong></td>
                  <td className="p-2 align-top">Optional marketing emails and product updates (you may withdraw at any time)</td>
                  <td className="p-2 align-top">Email address</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>4. ATC Voice Trainer — Audio Policy</h2>
          <p>
            Voice audio is processed in real-time and is <strong>NOT stored</strong>. Your microphone audio is streamed live to the speech model to generate the controller's response, then discarded as soon as the session ends. We do not write voice recordings to disk and we do not retain any audio files.
          </p>
          <p>
            The session transcript (your phraseology in text form and the controller's responses) is stored as part of your training history so you can review your debrief and track improvement over time.
          </p>

          <h2>5. Subprocessors</h2>
          <p>
            We share data only with the following vetted subprocessors that help us deliver the Service. Each has signed a Data Processing Agreement consistent with our GDPR obligations:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-2 border-b border-border">Subprocessor</th>
                  <th className="text-left p-2 border-b border-border">Purpose</th>
                  <th className="text-left p-2 border-b border-border">Location</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-2 border-b border-border"><strong>Supabase</strong></td><td className="p-2 border-b border-border">Database, authentication, file storage, edge functions</td><td className="p-2 border-b border-border">US</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>Cloudflare</strong></td><td className="p-2 border-b border-border">CDN, edge compute, DNS, DDoS protection</td><td className="p-2 border-b border-border">Global</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>Anthropic</strong></td><td className="p-2 border-b border-border">Claude AI models — oral coach, scenarios, coaching</td><td className="p-2 border-b border-border">US</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>OpenAI</strong></td><td className="p-2 border-b border-border">GPT models — written prep and study assistance</td><td className="p-2 border-b border-border">US</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>Stripe</strong></td><td className="p-2 border-b border-border">Payment processing and billing</td><td className="p-2 border-b border-border">US</td></tr>
                <tr><td className="p-2"><strong>Resend</strong></td><td className="p-2">Transactional email delivery</td><td className="p-2">US</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Important:</strong> Anthropic, OpenAI, and Google are contractually prohibited from using your data to train their general models when accessed through their commercial APIs under standard API terms.
          </p>

          <h2>6. How Long We Keep Your Data</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-2 border-b border-border">Data Type</th>
                  <th className="text-left p-2 border-b border-border">Retention Period</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-2 border-b border-border"><strong>Account & training data</strong></td><td className="p-2 border-b border-border">While account is active + 24 months after deletion</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>ATC voice audio</strong></td><td className="p-2 border-b border-border">Not retained — discarded in real-time</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>Consent log entries</strong></td><td className="p-2 border-b border-border">Life of account + 7 years (legal audit trail)</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>Billing records</strong></td><td className="p-2 border-b border-border">7 years (tax law requirement)</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>Server access logs</strong></td><td className="p-2 border-b border-border">90 days</td></tr>
                <tr><td className="p-2 border-b border-border"><strong>Support tickets</strong></td><td className="p-2 border-b border-border">24 months</td></tr>
                <tr><td className="p-2"><strong>Anonymized analytics</strong></td><td className="p-2">Indefinitely (no personal data)</td></tr>
              </tbody>
            </table>
          </div>

          <h2>7. Your Rights — All Users</h2>
          <p>Regardless of where you are located, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
            <li><strong>Export:</strong> Request your data in a portable, machine-readable format</li>
            <li><strong>Withdraw consent:</strong> Withdraw consent for marketing emails at any time</li>
          </ul>
          <p>To exercise any of these rights, email <strong className="text-primary">privacy@simpilot.ai</strong>. We will respond within 30 days.</p>

          <h2>8. Your Rights — GDPR (EU & UK Users)</h2>
          <p>If you are located in the European Union or United Kingdom, you have additional rights under GDPR/UK GDPR:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data while a dispute is resolved</li>
            <li><strong>Right to object:</strong> Object to processing based on legitimate interests (e.g., analytics)</li>
            <li><strong>Right not to be subject to automated decisions:</strong> Request human review of any automated decision that significantly affects you</li>
            <li><strong>Right to lodge a complaint:</strong> File a complaint with your local supervisory authority (e.g., ICO in the UK, your national DPA in the EU)</li>
          </ul>
          <p>Our legal basis for processing EU/UK personal data is set out in Section 3 above.</p>
          <p>
            For GDPR rights requests, email <strong className="text-primary">privacy@simpilot.ai</strong> with subject line "GDPR Rights Request." We will respond within 30 days (and within 72 hours for data breach notifications where required).
          </p>

          <h2>9. Your Rights — CCPA / CPRA (California Users)</h2>
          <p>California residents have the following rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Right to Know:</strong> Request disclosure of what personal information we collect, use, disclose, and sell</li>
            <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
            <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
            <li><strong>Right to Opt-Out of Sale/Sharing:</strong> We do NOT sell personal information and do NOT share it for cross-context behavioral advertising</li>
            <li><strong>Right to Limit Use of Sensitive Personal Information:</strong> We do not use sensitive personal information beyond what is necessary to provide the Service</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
          </ul>
          <p>
            To submit a CCPA/CPRA request, email <strong className="text-primary">privacy@simpilot.ai</strong> with subject line "CCPA Rights Request." We will respond within 45 days as required by law.
          </p>

          <h2>10. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>TLS encryption for all data in transit</li>
            <li>Encryption at rest for database storage</li>
            <li>Cryptographic password hashing (bcrypt)</li>
            <li>Row-level security (RLS) on all training data — users can only access their own records</li>
            <li>Strict role-based access control for staff</li>
            <li>Audit logging of all administrative access</li>
            <li>Automated abuse detection and cost monitoring</li>
            <li>Regular security reviews</li>
          </ul>
          <p>No method of transmission or storage is 100% secure. In the event of a data breach affecting your rights, we will notify you as required by applicable law.</p>

          <h2>11. Children's Privacy</h2>
          <p>The Service is intended for users 16 years of age and older. We do not knowingly collect personal data from children under 13.</p>
          <p>If you are between 13 and 17 years of age, you represent that you have obtained parental or guardian consent to use the Service.</p>
          <p>If you believe we have inadvertently collected data from a child under 13, please contact <strong className="text-primary">privacy@simpilot.ai</strong> immediately and we will delete it promptly.</p>

          <h2>12. International Data Transfers</h2>
          <p>We are based in the United States. If you access the Service from outside the US, your personal data will be transferred to and processed in the United States.</p>
          <p>For EU/UK users, we transfer data under Standard Contractual Clauses (SCCs) approved by the European Commission, or other appropriate safeguards as required by GDPR.</p>
          <p>By using the Service, you acknowledge that your data may be transferred to the US, which may have different data protection laws than your home country.</p>

          <h2>13. Cookies & Tracking</h2>
          <p>We use the following types of cookies and local storage:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Essential cookies:</strong> Authentication tokens and session management — required for the Service to function</li>
            <li><strong>Preference storage:</strong> Certificate goal, UI preferences stored in localStorage — never shared with third parties</li>
            <li><strong>Analytics:</strong> Anonymized usage metrics to improve the Service — no cross-site tracking</li>
          </ul>
          <p>We do not use advertising cookies or third-party tracking pixels. You can clear cookies and localStorage through your browser settings, but this may affect Service functionality.</p>

          <h2>14. Third-Party Links</h2>
          <p>The Service may contain links to third-party websites (e.g., FAA publications, aviation resources). This Privacy Policy does not apply to those sites. We encourage you to review the privacy policies of any third-party sites you visit.</p>

          <h2>15. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Material changes will be communicated by email or in-app notice at least 14 days before they take effect.</p>
          <p>You can always view the current version and historical versions of this Privacy Policy at <a href="https://simpilot.ai/privacy" className="text-primary hover:underline">https://simpilot.ai/privacy</a>.</p>
          <p>Continued use of the Service after the effective date constitutes your acceptance of the updated Privacy Policy. Where required by law, we will obtain your explicit re-consent.</p>

          <h2>16. Contact & Data Protection</h2>
          <p>For any privacy questions, rights requests, or concerns:</p>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <ul className="list-disc pl-6 space-y-1 !text-foreground">
              <li>Privacy requests: <strong className="text-primary">privacy@simpilot.ai</strong></li>
              <li>General support: <strong className="text-primary">support@simpilot.ai</strong></li>
              <li>Website: <a href="https://simpilot.ai" className="text-primary hover:underline">https://simpilot.ai</a></li>
            </ul>
          </div>
          <p>We aim to respond to all privacy inquiries within 30 days. For urgent matters involving potential data breaches, we will respond within 72 hours.</p>

          <p className="text-xs text-muted-foreground italic text-center">© 2026 SimPilot.ai. All rights reserved.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
