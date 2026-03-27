import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms & Conditions — SimPilot.AI"
        description="Read SimPilot.AI's Terms & Conditions. Important: SimPilot.AI is NOT FAA-approved and is for unofficial, supplemental pilot training purposes only. Official flight training must be obtained from certified schools."
        keywords="SimPilot.AI terms and conditions, pilot training disclaimer, not FAA approved, unofficial training, aviation training terms, flight school disclaimer"
        canonical="/terms"
      />
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link to="/" className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
            SIM<span className="text-accent">PILOT</span>.AI
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 27, 2026</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-secondary-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-secondary-foreground [&_li]:text-sm [&_strong]:text-foreground">

          {/* CRITICAL DISCLAIMER */}
          <div className="bg-destructive/10 border-2 border-destructive/40 rounded-xl p-6">
            <h2 className="!text-destructive !mt-0 text-base uppercase tracking-wider">⚠️ Critical Disclaimer — Please Read Carefully</h2>
            <p className="!text-foreground font-semibold">
              SimPilot.AI is <strong className="!text-destructive">NOT approved, endorsed, certified, or affiliated with the Federal Aviation Administration (FAA)</strong>, any Civil Aviation Authority (CAA), the International Civil Aviation Organization (ICAO), or any governmental aviation regulatory body worldwide.
            </p>
            <p className="!text-foreground font-semibold">
              This platform is <strong className="!text-destructive">NOT a substitute for official flight training</strong>. It does not replace, supplement, or serve as equivalent to instruction from an FAA-certificated flight instructor (CFI), an FAA-approved Part 61 or Part 141 flight school, or any officially recognized aviation training organization.
            </p>
            <p className="!text-foreground font-semibold">
              <strong className="!text-destructive">You MUST receive proper flight training from an authorized flight school and a certificated flight instructor</strong> before acting as pilot in command of any aircraft. Failure to do so is a violation of federal aviation regulations and may endanger your life and the lives of others.
            </p>
          </div>

          <h2>1. Nature of the Service</h2>
          <p>
            SimPilot.AI provides <strong>artificial intelligence-powered educational content for informational and supplemental study purposes only</strong>. The platform uses AI language models to simulate flight instruction scenarios, including but not limited to ground school review, oral exam preparation, and general aviation knowledge discussion.
          </p>
          <p>
            The AI-generated content:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>May contain errors, inaccuracies, or outdated information</li>
            <li>Does <strong>NOT</strong> constitute official flight instruction under 14 CFR Part 61 or Part 141</li>
            <li>Cannot be logged as ground instruction or flight training time</li>
            <li>Does not satisfy any FAA training requirements, endorsements, or sign-offs</li>
            <li>Should never be the sole source of aviation knowledge for any certificate or rating</li>
          </ul>

          <h2>2. No FAA Approval or Certification</h2>
          <p>
            To be absolutely clear: <strong>SimPilot.AI holds no FAA approvals of any kind</strong>. This includes but is not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>No Part 141 or Part 142 training course approval</li>
            <li>No Training Center Certificate (TCC)</li>
            <li>No FAA Advisory Circular (AC) compliance certification</li>
            <li>No Advanced Aviation Training Device (AATD) or Basic Aviation Training Device (BATD) qualification</li>
            <li>No authorization to provide endorsements, sign-offs, or any official documentation</li>
            <li>No approval to conduct knowledge test preparation under any FAA program</li>
          </ul>
          <p>
            Any reference to FAA standards, the Airman Certification Standards (ACS), Practical Test Standards (PTS), Federal Aviation Regulations (FARs), or the Aeronautical Information Manual (AIM) is <strong>purely for educational context</strong> and does not imply any FAA endorsement or approval.
          </p>

          <h2>3. Mandatory Requirement for Official Training</h2>
          <p>
            By using SimPilot.AI, you acknowledge and agree that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>You must obtain all flight training from an FAA-certificated flight instructor (CFI)</strong> at an approved flight school or under an independent CFI operating under 14 CFR Part 61.</li>
            <li><strong>You must complete all required training, endorsements, and flight hours</strong> as specified by the applicable FARs for any pilot certificate or rating you seek.</li>
            <li><strong>You must pass an official FAA Knowledge Test</strong> at an authorized testing center, not through this platform.</li>
            <li><strong>You must pass a practical test (checkride)</strong> administered by an FAA Designated Pilot Examiner (DPE) or FAA Aviation Safety Inspector (ASI).</li>
            <li><strong>You should always verify information</strong> presented by this AI against official FAA publications, including the current editions of the FAR/AIM, ACS, Advisory Circulars, and POH/AFM for specific aircraft.</li>
          </ul>

          <h2>4. AI Limitations & Accuracy</h2>
          <p>
            The AI instructor persona ("CFI-AI") is a <strong>simulated character</strong> powered by artificial intelligence. It is not a real person, not a certificated flight instructor, and not qualified to provide actual flight instruction.
          </p>
          <p>
            AI-generated responses may:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Contain factual errors or "hallucinations" (confidently stated but incorrect information)</li>
            <li>Reference outdated regulations, procedures, or information</li>
            <li>Provide general information that may not apply to your specific aircraft, airport, or situation</li>
            <li>Fail to account for local procedures, NOTAMs, TFRs, or current weather conditions</li>
            <li>Give advice that conflicts with your CFI's instructions — <strong>always follow your real CFI's guidance</strong></li>
          </ul>

          <h2>5. Scores, Grades & Assessments</h2>
          <p>
            Any scores, grades, pass/fail results, or performance assessments provided by SimPilot.AI are <strong>entirely unofficial and have no regulatory significance</strong>. They:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Do not indicate readiness for an FAA knowledge test or practical test</li>
            <li>Cannot be used as evidence of training completion</li>
            <li>Do not replace instructor endorsements required under 14 CFR §61.35, §61.39, or any other regulation</li>
            <li>Are for self-assessment and study motivation only</li>
          </ul>

          <h2>6. Safety & Risk Acknowledgment</h2>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="!text-foreground font-semibold">
              Aviation is inherently dangerous. <strong className="!text-destructive">Improper training or reliance on unverified information can result in serious injury or death.</strong>
            </p>
            <p>
              You agree that you will <strong>NEVER</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Rely solely on SimPilot.AI for any flight-related decision</li>
              <li>Use information from this platform as a substitute for proper pre-flight planning, weather briefings, or NOTAMs</li>
              <li>Operate an aircraft based on knowledge obtained exclusively from this platform</li>
              <li>Attempt any maneuver or procedure in an actual aircraft that you have not been properly trained on by a certificated instructor</li>
            </ul>
          </div>

          <h2>7. User Eligibility & Responsibility</h2>
          <p>You must be at least 13 years of age to use this service. By creating an account, you represent that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You understand this is an unofficial, AI-powered study aid</li>
            <li>You will seek and obtain proper flight training from authorized sources</li>
            <li>You accept full responsibility for how you use information from this platform</li>
            <li>You will not hold SimPilot.AI liable for any errors, omissions, or consequences arising from use of the platform</li>
          </ul>

          <h2>8. Subscription & Billing</h2>
          <p>
            SimPilot.AI offers free and paid subscription tiers. By subscribing to a paid plan:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You authorize recurring charges at the selected billing interval</li>
            <li>Free trials automatically convert to paid subscriptions unless cancelled</li>
            <li>You may cancel at any time; access continues through the end of the billing period</li>
            <li>Refunds are handled on a case-by-case basis</li>
          </ul>

          <h2>9. Data Privacy</h2>
          <p>
            We collect and store your email, chat conversations, and training progress data. This data is used solely to provide and improve the service. We do not sell your personal data to third parties. Chat content may be used in anonymized form to improve AI responses.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, SimPilot.AI, its creators, employees, and affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use or inability to use the platform</li>
            <li>Errors or inaccuracies in AI-generated content</li>
            <li>Reliance on information provided by the platform</li>
            <li>Any aviation incident or accident related to use of this platform</li>
          </ul>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless SimPilot.AI from any claims, damages, or expenses arising from your use of the platform, your violation of these terms, or your violation of any aviation regulation.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. Material changes will be communicated via email or in-app notification.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These terms shall be governed by the laws of the United States. Any disputes shall be resolved through binding arbitration.
          </p>

          {/* Final reminder */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 mt-8">
            <p className="!text-foreground font-semibold text-center">
              By creating an account on SimPilot.AI — whether free, trial, or paid — you confirm that you have <strong>read, understood, and agree</strong> to all terms above. You acknowledge that <strong>this platform is not FAA-approved</strong> and that <strong>you must obtain official flight training from certificated instructors and approved schools</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
