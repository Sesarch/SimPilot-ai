/**
 * Sections 1–17 of the SimPilot.AI Terms & Conditions.
 *
 * Rendered as the body of /terms AND embedded into the signup
 * scrollable acceptance container. Single source of truth.
 *
 * Sections 1–7 are PRESERVED VERBATIM from the prior version of the
 * Terms (Mar 27, 2026) per attorney-review constraints. Sections 8–17
 * are the rewritten/expanded clauses.
 */
export const TermsContent = () => {
  return (
    <div className="prose prose-sm prose-invert max-w-none space-y-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-sm [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-secondary-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-secondary-foreground [&_li]:text-sm [&_strong]:text-foreground">

      {/* CRITICAL DISCLAIMER — preserved verbatim */}
      <div className="bg-destructive/10 border-2 border-destructive/40 rounded-xl p-6">
        <h2 className="!text-destructive !mt-0 text-base uppercase tracking-wider">⚠️ Critical Disclaimer — Please Read Carefully</h2>
        <p className="!text-foreground">
          SimPilot.AI is <strong className="!text-destructive">NOT approved, endorsed, certified, or affiliated with the Federal Aviation Administration (FAA)</strong>, any Civil Aviation Authority (CAA), the International Civil Aviation Organization (ICAO), or any governmental aviation regulatory body worldwide.
        </p>
        <p className="!text-foreground">
          This platform is <strong className="!text-destructive">NOT a substitute for official flight training</strong>. It does not replace, supplement, or serve as equivalent to instruction from an FAA-certificated flight instructor (CFI), an FAA-approved Part 61 or Part 141 flight school, or any officially recognized aviation training organization.
        </p>
        <p className="!text-foreground">
          <strong className="!text-destructive">You MUST receive proper flight training from an authorized flight school and a certificated flight instructor</strong> before acting as pilot in command of any aircraft. Failure to do so is a violation of federal aviation regulations and may endanger your life and the lives of others.
        </p>
      </div>

      <h2>1. Nature of the Service</h2>
      <p>
        SimPilot.AI provides <strong>artificial intelligence-powered educational content for informational and supplemental study purposes only</strong>. The platform uses AI language models to simulate flight instruction scenarios, including but not limited to ground school review, oral exam preparation, and general aviation knowledge discussion.
      </p>
      <p>The AI-generated content:</p>
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
      <p>By using SimPilot.AI, you acknowledge and agree that:</p>
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
      <p>AI-generated responses may:</p>
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
        <p className="!text-foreground">
          Aviation is inherently dangerous. <strong className="!text-destructive">Improper training or reliance on unverified information can result in serious injury or death.</strong>
        </p>
        <p>You agree that you will <strong>NEVER</strong>:</p>
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

      {/* ===== REWRITTEN SECTIONS 8–17 ===== */}

      <h2>8. Subscription, Billing & Guarantee</h2>

      <h3>8.1 Available Plans</h3>
      <p>
        SimPilot.AI offers three plans: <strong>Pilot Monthly ($39/month)</strong>, <strong>Pilot Annual ($299/year)</strong>, and <strong>Checkride Lifetime ($399 one-time)</strong>. Full details are on the Pricing page, which is incorporated by reference.
      </p>

      <h3>8.2 Free Trial</h3>
      <p>
        New accounts may activate a 7-day free trial on the Monthly or Annual plan. The Checkride Lifetime plan does not include a trial. Trials are one per person, lifetime. Your card is authorized at trial start but not charged until the trial ends. You may cancel at any time during the trial to avoid charges.
      </p>

      <h3>8.3 Auto-Renewal</h3>
      <p>
        Monthly and Annual plans auto-renew at the end of each billing period until you cancel. You can cancel anytime in your account settings; cancellation takes effect at the end of your current paid period.
      </p>

      <h3>8.4 Checkride Lifetime — Important Bounded-Access Notice</h3>
      <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
        <p className="!text-foreground">
          <strong className="!text-accent">"Checkride Lifetime" is NOT a perpetual or truly unlimited subscription.</strong> It is a one-time payment that provides access for the duration of your training toward <strong>ONE specific FAA pilot certificate or rating</strong> (your "Target Rating"), which you select at signup, plus <strong>90 days</strong> after you pass that rating's practical test.
        </p>
        <p>
          If you do not pass your Target Rating within <strong>24 months of purchase</strong>, your access ends and you may purchase a new plan. We use the word "Lifetime" to indicate <em>"until you complete the goal,"</em> not <em>"forever."</em>
        </p>
      </div>

      <h3>8.5 Conversation Caps</h3>
      <p>
        Each plan includes a monthly cap on AI conversations (Monthly: 500, Annual: 1,000, Lifetime: 1,500). Once you reach your cap, you may purchase additional conversation credits at <strong>$9 per 250 conversations</strong>, or wait until the next monthly reset. Caps protect us from runaway API costs and let us keep prices reasonable.
      </p>

      <h3>8.6 Refunds</h3>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>(a) Monthly and Annual plans:</strong> full refund within 14 days of purchase if you have used fewer than 20 AI conversations. After 14 days or after 20 conversations, no refunds.</li>
        <li><strong>(b) Checkride Lifetime:</strong> full refund within 14 days of purchase if you have used fewer than 50 AI conversations. After that, no refunds.</li>
        <li>
          <strong>(c) Pass-the-Checkride Guarantee (Annual and Checkride Lifetime only):</strong> If you do not pass your Target Rating's written exam OR practical test on your first attempt, we will refund your most recent annual payment or full Checkride Lifetime payment, provided ALL of the following are true:
          <ul className="list-[lower-roman] pl-6 mt-1 space-y-0.5">
            <li>You completed all SimPilot.AI study modules for that rating before the attempt;</li>
            <li>You maintained an active subscription for at least 90 days before the attempt;</li>
            <li>You averaged at least 4 hours of SimPilot.AI study per week during your subscription;</li>
            <li>You submit official FAA documentation of your failed attempt within 30 days of the failure date.</li>
          </ul>
        </li>
        <li><strong>(d)</strong> Outside these cases, refunds are at SimPilot.AI's reasonable discretion.</li>
      </ul>

      <h3>8.7 Price Changes</h3>
      <p>
        We may change prices for future billing periods with at least 30 days' advance email notice. Checkride Lifetime purchases are locked at the price you paid for the duration of your access window.
      </p>

      <h3>8.8 Payment Processing</h3>
      <p>
        Payments are processed by <strong>Stripe, Inc.</strong> By paying, you agree to Stripe's terms in addition to ours.
      </p>

      <h2>9. Data Privacy & Your Rights</h2>

      <h3>9.1 What We Collect</h3>
      <p>
        Email, account info, chat conversations, AI interaction logs, training progress, and uploaded files (e.g., POHs). Full details in our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
      </p>

      <h3>9.2 How We Use It</h3>
      <p>
        To provide and improve the Service. Chat content may be used in anonymized form to improve AI responses. <strong>We do not sell your personal data to third parties.</strong>
      </p>

      <h3>9.3 Your Rights — GDPR (EU/UK users)</h3>
      <p>
        You have the right to access, correct, delete, port, and restrict processing of your data, and to object to certain processing. Email <a href="mailto:privacy@simpilot.ai" className="text-primary hover:underline">privacy@simpilot.ai</a> to exercise these rights. We will respond within 30 days.
      </p>

      <h3>9.4 Your Rights — CCPA / CPRA (California users)</h3>
      <p>
        You have the right to know what personal data we collect about you, request its deletion, opt out of any sale (we do not sell), and not be discriminated against for exercising these rights. Email <a href="mailto:privacy@simpilot.ai" className="text-primary hover:underline">privacy@simpilot.ai</a>.
      </p>

      <h3>9.5 Data Retention</h3>
      <p>
        Active account data is retained while your account is active. Deleted accounts: chat history removed within 30 days; aggregated/anonymized analytics may be retained indefinitely.
      </p>

      <h3>9.6 Children's Privacy</h3>
      <p>
        SimPilot.AI is not directed at children under 13. We do not knowingly collect personal data from anyone under 13. Users aged 13-17 require parental or guardian consent.
      </p>

      <h2>10. Limitation of Liability</h2>

      <h3>10.1</h3>
      <p>
        SimPilot.AI is provided <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, non-infringement, and accuracy.
      </p>

      <h3>10.2</h3>
      <p>
        To the maximum extent permitted by law, SimPilot.AI, its owners, employees, contractors, and affiliates shall not be liable for any:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>(a) Indirect, incidental, consequential, special, exemplary, or punitive damages;</li>
        <li>(b) Loss of profits, revenue, data, goodwill, or other intangible losses;</li>
        <li>(c) Damages from your use or inability to use the Service;</li>
        <li>(d) Damages from any decision you make or action you take in or around an aircraft based on Service output;</li>
        <li>(e) Damages from any aviation incident, accident, regulatory violation, failed exam, or certificate suspension involving any aircraft.</li>
      </ul>

      <h3>10.3 Liability Cap</h3>
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <p className="!text-foreground uppercase tracking-wide text-xs">
          OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF:
        </p>
        <ul className="list-disc pl-6 space-y-1 !text-foreground">
          <li>(a) The amount you paid SimPilot.AI in the twelve (12) months preceding the event giving rise to the claim, or</li>
          <li>(b) One Hundred U.S. Dollars (US $100).</li>
        </ul>
      </div>

      <h3>10.4</h3>
      <p>These limitations apply even if a remedy fails of its essential purpose.</p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless SimPilot.AI and its owners, employees, contractors, and affiliates from any third-party claim, loss, damage, liability, cost, or expense (including reasonable attorneys' fees) arising from:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>(a) Your use of the Service;</li>
        <li>(b) Your violation of these Terms;</li>
        <li>(c) Your violation of any law or third-party right;</li>
        <li>(d) Any action you take in or around an aircraft based on Service output;</li>
        <li>(e) Content you upload, including any POH or aircraft documentation.</li>
      </ul>

      <h2>12. Class Action Waiver</h2>
      <p>
        You and SimPilot.AI agree that any dispute will be resolved on an <strong>individual basis</strong>. You waive any right to participate in a class action, class arbitration, or representative proceeding against SimPilot.AI. <em>(Where this waiver is unenforceable under applicable law, this clause is severable and the remainder of these Terms remains in effect.)</em>
      </p>

      <h2>13. Intellectual Property</h2>

      <h3>13.1 SimPilot.AI Property</h3>
      <p>
        The Service, including software, AI models, prompts, design, content, trademarks, and underlying technology, is owned by SimPilot.AI or its licensors and is protected by intellectual property laws.
      </p>

      <h3>13.2 Your Content</h3>
      <p>
        You retain ownership of content you upload (e.g., POH files). You grant SimPilot.AI a limited, non-exclusive license to use, process, and display that content solely to provide the Service to you.
      </p>

      <h3>13.3 AI Output</h3>
      <p>
        AI-generated responses are provided to you for your personal study use. You may not resell, redistribute, or use AI outputs to train a competing AI system.
      </p>

      <h3>13.4 Feedback</h3>
      <p>If you send us feedback or suggestions, we may use them without obligation or compensation.</p>

      <h2>14. Service Availability & Modifications</h2>

      <h3>14.1</h3>
      <p>
        We may modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable advance notice of material changes.
      </p>

      <h3>14.2 Service Discontinuation — Paid Users</h3>
      <p>If we discontinue the Service entirely:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>(a) <strong>Monthly subscribers:</strong> no further billing; access continues through the end of the current paid month.</li>
        <li>(b) <strong>Annual subscribers:</strong> prorated refund based on unused months.</li>
        <li>(c) <strong>Checkride Lifetime:</strong> prorated refund based on time elapsed since purchase, prorated against a 24-month expected access window.</li>
      </ul>
      <p>This is your sole remedy if we discontinue the Service.</p>

      <h3>14.3 Force Majeure</h3>
      <p>
        We are not liable for delays or failures caused by events beyond our reasonable control, including AI provider outages, internet outages, natural disasters, or regulatory action.
      </p>

      <h2>15. Changes to Terms</h2>
      <p>
        We may update these Terms. Material changes will be communicated by email or in-app notice at least <strong>30 days</strong> before they take effect. Continued use after the effective date constitutes acceptance.
      </p>

      <h2>16. Governing Law & Dispute Resolution</h2>

      <h3>16.1</h3>
      <p>
        These Terms are governed by the laws of the State of <strong>[ATTORNEY TO SPECIFY]</strong>, without regard to conflict of laws principles.
      </p>

      <h3>16.2</h3>
      <p>
        Any dispute arising from these Terms or the Service shall be resolved by binding arbitration administered by <strong>JAMS</strong> in <strong>[ATTORNEY TO SPECIFY CITY]</strong>, under JAMS' Streamlined Arbitration Rules. Either party may bring small claims in small claims court.
      </p>

      <h3>16.3</h3>
      <p>The class action waiver in Section 12 applies to arbitration.</p>

      <p className="text-xs italic !text-muted-foreground">
        [Note for legal review: Arbitration and class action waiver are unenforceable in some jurisdictions. Attorney must finalize this section.]
      </p>

      <h2>17. Contact</h2>
      <ul className="list-none pl-0 space-y-1">
        <li>Legal questions: <a href="mailto:legal@simpilot.ai" className="text-primary hover:underline">legal@simpilot.ai</a></li>
        <li>Safety reports: <a href="mailto:safety@simpilot.ai" className="text-primary hover:underline">safety@simpilot.ai</a></li>
        <li>Privacy: <a href="mailto:privacy@simpilot.ai" className="text-primary hover:underline">privacy@simpilot.ai</a></li>
        <li>Sales: <a href="mailto:sales@simpilot.ai" className="text-primary hover:underline">sales@simpilot.ai</a></li>
        <li>General support: <a href="mailto:support@simpilot.ai" className="text-primary hover:underline">support@simpilot.ai</a></li>
      </ul>

      {/* Final acknowledgment */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 mt-8">
        <h2 className="!text-primary !mt-0 text-base uppercase tracking-wider">Acknowledgment</h2>
        <p className="!text-foreground">
          By creating an account on SimPilot.AI — whether free, trial, or paid — you confirm that you have <strong>read and understood</strong> all Terms above. You specifically acknowledge:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 !text-foreground">
          <li>(a) SimPilot.AI is not FAA-approved and is not a substitute for instruction by a Certificated Flight Instructor.</li>
          <li>(b) AI responses may contain errors and you will verify all safety-critical information against authoritative sources before acting on it.</li>
          <li>(c) You are Pilot in Command (or a student under one) and bear full responsibility for any decision made in or around an aircraft.</li>
          <li>(d) You understand the bounded nature of the Checkride Lifetime plan (if you purchased it) as described in Section 8.4.</li>
          <li>(e) You agree to the limitation of liability in Section 10 and the dispute resolution process in Section 16.</li>
        </ul>
      </div>
    </div>
  );
};

export default TermsContent;
