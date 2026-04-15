import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy — SimPilot.AI"
        description="Learn how SimPilot.AI collects, uses, and protects your personal data. Our privacy policy covers data handling for AI pilot training sessions, chat history, and account information."
        keywords="SimPilot.AI privacy policy, pilot training data privacy, aviation training data protection, AI chat privacy, personal data policy"
        canonical="/privacy"
        ogImage="/og-privacy.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Privacy Policy — SimPilot.AI",
          "description": "Learn how SimPilot.AI collects, uses, and protects your personal data.",
          "url": "https://simpilot.ai/privacy",
          "inLanguage": "en-US",
          "isPartOf": { "@type": "WebSite", "name": "SimPilot.AI", "url": "https://simpilot.ai" },
          "about": { "@type": "Thing", "name": "Privacy Policy" },
          "publisher": { "@type": "Organization", "name": "SimPilot.AI", "url": "https://simpilot.ai" }
        }}
      />
      <Navbar />

      <div className="container mx-auto px-6 py-12 pt-24 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 27, 2026</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-secondary-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-secondary-foreground [&_li]:text-sm [&_strong]:text-foreground">

          <p>
            SimPilot.AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>

          <h2>1. Information We Collect</h2>

          <h3>1.1 Information You Provide</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account information:</strong> Name, email address, and password when you create an account</li>
            <li><strong>Profile data:</strong> Display name, avatar, certificate type, flight hours, and bio if you choose to provide them</li>
            <li><strong>Chat content:</strong> Messages you send during training sessions, ground school lessons, and oral exam practice</li>
            <li><strong>Payment information:</strong> Billing details processed through our third-party payment processor (we do not store full credit card numbers)</li>
          </ul>

          <h3>1.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Usage data:</strong> Pages visited, features used, session duration, and interaction patterns</li>
            <li><strong>Device information:</strong> Browser type, operating system, device type, and screen resolution</li>
            <li><strong>Log data:</strong> IP address, access times, and referring URLs</li>
            <li><strong>Cookies:</strong> Authentication tokens and preference settings stored in your browser</li>
          </ul>

          <h3>1.3 Training & Progress Data</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ground school topic completion status</li>
            <li>Oral exam scores, results, and performance history</li>
            <li>Session history and chat transcripts</li>
            <li>Daily message usage counts</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Service delivery:</strong> Providing AI-powered training sessions, tracking your progress, and personalizing your learning experience</li>
            <li><strong>Account management:</strong> Creating and managing your account, authenticating access, and processing subscriptions</li>
            <li><strong>AI improvement:</strong> Analyzing anonymized chat data to improve the quality and accuracy of AI responses</li>
            <li><strong>Communication:</strong> Sending account-related emails such as verification, password reset, and important service updates</li>
            <li><strong>Safety & compliance:</strong> Detecting and preventing fraud, abuse, or violations of our Terms & Conditions</li>
            <li><strong>Analytics:</strong> Understanding usage patterns to improve the platform's features and user experience</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>We do <strong>not</strong> sell your personal data. We may share information in the following limited circumstances:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Service providers:</strong> Third-party services that help us operate the platform (hosting, payment processing, email delivery, analytics). These providers are contractually obligated to protect your data.</li>
            <li><strong>AI model providers:</strong> Chat messages are sent to AI model providers to generate responses. Messages are processed in real-time and are not retained by AI providers for their own training unless specified otherwise.</li>
            <li><strong>Legal requirements:</strong> When required by law, subpoena, court order, or to protect our legal rights</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity</li>
            <li><strong>Aggregated data:</strong> We may share anonymized, aggregated statistics that cannot identify individual users</li>
          </ul>

          <h2>4. Data Storage & Security</h2>
          <p>
            Your data is stored on secure, encrypted servers. We implement industry-standard security measures including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encryption in transit (TLS/SSL) and at rest</li>
            <li>Row-level security policies ensuring users can only access their own data</li>
            <li>Secure authentication with hashed passwords</li>
            <li>Regular security audits and monitoring</li>
          </ul>
          <p>
            While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.
          </p>

          <h2>5. Data Retention</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account data:</strong> Retained for as long as your account is active. Upon account deletion, personal data is removed within 30 days.</li>
            <li><strong>Chat history:</strong> Retained for as long as your account is active to enable session history review and progress tracking.</li>
            <li><strong>Usage analytics:</strong> Anonymized usage data may be retained indefinitely for analytical purposes.</li>
            <li><strong>Billing records:</strong> Retained as required by applicable tax and financial regulations.</li>
          </ul>

          <h2>6. Your Rights & Choices</h2>
          <p>Depending on your jurisdiction, you may have the following rights:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data and account</li>
            <li><strong>Portability:</strong> Request your data in a portable, machine-readable format</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
            <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at <strong className="text-primary">privacy@simpilot.ai</strong>.
          </p>

          <h2>7. Cookies & Tracking</h2>
          <p>We use essential cookies for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Authentication:</strong> Keeping you signed in during your session</li>
            <li><strong>Preferences:</strong> Remembering your settings (e.g., theme preference)</li>
            <li><strong>Security:</strong> Preventing cross-site request forgery and other attacks</li>
          </ul>
          <p>
            We do not use third-party advertising cookies or cross-site tracking. You can configure your browser to refuse cookies, though this may limit platform functionality.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            SimPilot.AI is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that we have collected data from a child under 13, we will delete it promptly. If you believe a child under 13 has provided us with personal data, please contact us immediately.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our platform, you consent to the transfer of your data to these countries. We take appropriate safeguards to ensure your data remains protected in accordance with this Privacy Policy.
          </p>

          <h2>10. California Privacy Rights (CCPA)</h2>
          <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The right to know what personal information is collected, used, shared, or sold</li>
            <li>The right to delete personal information held by businesses</li>
            <li>The right to opt-out of the sale of personal information (we do not sell personal data)</li>
            <li>The right to non-discrimination for exercising your CCPA rights</li>
          </ul>

          <h2>11. European Privacy Rights (GDPR)</h2>
          <p>If you are located in the European Economic Area (EEA), UK, or Switzerland:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Our legal basis for processing your data includes: consent, contract performance, and legitimate interests</li>
            <li>You have the right to lodge a complaint with your local data protection authority</li>
            <li>You may request data portability in a structured, commonly used format</li>
          </ul>

          <h2>12. Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.
          </p>

          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the platform and updating the "Last updated" date. Your continued use of SimPilot.AI after changes constitutes acceptance of the updated Privacy Policy.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
          </p>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <p className="!text-foreground">
              <strong>SimPilot.AI Privacy Team</strong><br />
              Email: <strong className="text-primary">privacy@simpilot.ai</strong>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
