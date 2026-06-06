/**
 * SimPilot.ai Terms of Service — full body.
 *
 * Rendered as the body of /terms AND embedded into the signup
 * scrollable acceptance container. Single source of truth.
 *
 * Version 2026-06-05 — replaces prior 2026-05-17 text.
 */
export const TermsContent = () => {
  return (
    <div className="prose prose-sm prose-invert max-w-none space-y-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-sm [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-secondary-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-secondary-foreground [&_li]:text-sm [&_strong]:text-foreground">

      {/* CRITICAL DISCLAIMER */}
      <div className="bg-destructive/10 border-2 border-destructive/40 rounded-xl p-6">
        <h2 className="!text-destructive !mt-0 text-base uppercase tracking-wider">
          ⚠️ Critical Disclaimer — Read Carefully Before Using This Service
        </h2>
        <p className="!text-foreground">
          SimPilot.ai is <strong className="!text-destructive">NOT approved, endorsed, certified, or affiliated with the Federal Aviation Administration (FAA)</strong>, any Civil Aviation Authority, the International Civil Aviation Organization (ICAO), or any governmental aviation regulatory body.
        </p>
        <p className="!text-foreground">
          This platform is <strong className="!text-destructive">NOT a substitute for official flight training</strong>. It does not replace instruction from an FAA-certificated flight instructor (CFI) or an FAA-approved Part 61 or Part 141 flight school.
        </p>
        <p className="!text-foreground">
          <strong className="!text-destructive">You MUST receive proper flight training from an authorized flight school and a certificated flight instructor</strong> before acting as pilot in command of any aircraft. Failure to do so is a violation of federal aviation regulations and may endanger your life and the lives of others.
        </p>
      </div>

      <h2>1. Agreement</h2>
      <p>
        By creating an account or using SimPilot.ai ("the Service," "we," "us," "our"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms form a binding legal contract between you and SimPilot.ai.
      </p>

      <h2>2. The Service</h2>
      <p>
        SimPilot.ai is a supplemental AI-powered training aid for student pilots pursuing FAA certificates and ratings. It provides:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Adaptive written test preparation and practice questions</li>
        <li>AI-driven oral exam coaching and mock checkride simulations</li>
        <li>Scenario-based aeronautical decision-making training</li>
        <li>Chart interpretation practice</li>
        <li>ATC voice communication practice</li>
        <li>Flight logbook tracking and currency management</li>
      </ul>
      <p><em>The Service is delivered via web browser and requires an internet connection.</em></p>

      <h2>3. Aviation Disclaimer (Critical)</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>SimPilot.ai is a supplemental training aid only.</strong> It does NOT issue FAA endorsements, FAA certificates, or any legal authorization for flight activities.</li>
        <li><strong>SimPilot.ai is NOT an FAA-certificated training school</strong> under Part 141 or Part 142.</li>
        <li>All FAA endorsements (student pilot, flight review, instrument proficiency check, cross-country, solo, etc.) <strong>MUST</strong> be signed by a certificated CFI in person. Records in this platform are training notes only and do <strong>NOT</strong> constitute legal endorsements.</li>
        <li>Completion of any course, exam, or scenario in this platform does <strong>NOT</strong> mean you are ready for an FAA checkride. Only a certificated CFI can determine checkride readiness.</li>
        <li>AI-generated content (lessons, scenarios, oral coach, mock checkride, ATC simulator, chart tutor) may contain errors, hallucinations, or outdated information. Users <strong>MUST</strong> independently verify all information against current FAA publications (14 CFR, AIM, current ACS, current Aeronautical Charts) before acting on it.</li>
        <li>The ATC voice simulator is a training simulator. It is <strong>NOT real ATC</strong>. Do not use simulator responses to make real-world flight decisions.</li>
        <li>Per <strong>14 CFR 91.3</strong>, the pilot-in-command is solely responsible for and is the final authority on the operation of the aircraft. Nothing in this platform reduces or alters that responsibility.</li>
      </ul>

      <h2>4. Eligibility & Account</h2>
      <p>You must be at least 16 years old to create an account. By registering, you represent that you meet this requirement. You are responsible for:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Keeping your login credentials confidential</li>
        <li>All activity that occurs under your account</li>
        <li>Notifying us immediately at <a href="mailto:support@simpilot.ai" className="text-primary hover:underline">support@simpilot.ai</a> of any unauthorized access</li>
      </ul>
      <p>Accounts are personal and non-transferable. You may not share account access with others.</p>

      <h2>5. Subscriptions, Trials & Billing</h2>

      <h3>5.1 Plans & Pricing</h3>
      <p>
        SimPilot.ai offers three plans: <strong>Pilot Monthly ($39/month)</strong>, <strong>Pilot Annual ($299/year)</strong>, and <strong>Checkride Lifetime ($399 one-time payment)</strong>. Full details are available on our Pricing page, which is incorporated by reference. Note: The Checkride Lifetime plan provides access for the duration of training toward one specific FAA certificate or rating, plus 90 days after passing the practical test, up to a maximum of 24 months.
      </p>

      <h3>5.2 Free Trial</h3>
      <p>
        New accounts may activate a 7-day free trial. We may require a valid payment method to start the trial. Trials are one per person, per lifetime. Your card is authorized at trial start but not charged until the trial ends. Cancel anytime during the trial to avoid charges.
      </p>

      <h3>5.3 Auto-Renewal</h3>
      <p>
        Paid plans renew automatically at the end of each billing period until canceled. You can cancel anytime in your account settings; cancellation takes effect at the end of your current paid period.
      </p>

      <h3>5.4 Refund Policy</h3>
      <p>
        Subscription fees are charged in advance and are non-refundable except as required by law. On cancellation, you retain access through the end of the current billing period. No prorated refunds are issued for partial periods.
      </p>

      <h3>5.5 Price Changes</h3>
      <p>
        We may change pricing on 30 days' advance email notice. Existing subscribers retain their current price through the end of the current billing period.
      </p>

      <h3>5.6 Payment Processing</h3>
      <p>
        Payments are processed by <strong>Stripe, Inc.</strong> By providing payment information, you also agree to Stripe's terms of service.
      </p>

      <h3>5.7 Service Discontinuation</h3>
      <p>If we discontinue the Service entirely:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Monthly subscribers: no further billing; access continues through end of current paid month.</li>
        <li>Annual subscribers: prorated refund based on unused full months remaining.</li>
      </ul>
      <p>This is your sole financial remedy in the event of service discontinuation.</p>

      <h2>6. Acceptable Use</h2>
      <p>You agree NOT to:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Resell, sublicense, or share account access with any other person</li>
        <li>Scrape, copy, or republish question banks, lessons, scenarios, or AI outputs in bulk</li>
        <li>Use AI outputs from the Service to misrepresent yourself to an FAA examiner, CFI, or other authority</li>
        <li>Use information from this platform as a substitute for proper pre-flight planning, official weather briefings, or NOTAMs</li>
        <li>Attempt to bypass authentication, rate limits, cost controls, or security measures</li>
        <li>Use the Service to harass, abuse, or harm any user, instructor, or our staff</li>
        <li>Operate an aircraft based exclusively on knowledge obtained from this platform without proper CFI instruction</li>
      </ul>

      <h2>7. No Warranty on AI Content</h2>
      <p>
        AI-generated content in this platform — including lessons, practice questions, scenarios, oral examiner responses, mock checkride evaluations, ATC simulator dialogue, and chart interpretations — is generated by large language models and may contain inaccuracies, hallucinations, outdated information, or errors.
      </p>
      <p>
        <strong>SIMPILOT.AI MAKES NO WARRANTY</strong> as to the accuracy, completeness, reliability, suitability, or currency of any AI-generated content. Users must independently verify all information against current authoritative FAA sources. <strong>SimPilot.ai disclaims all liability</strong> for any consequences of relying on AI-generated content without independent verification.
      </p>

      <h2>8. Assumption of Risk</h2>
      <p>Aviation activities involve inherent and significant physical risk, including risk of serious injury, death, and property damage. By using this platform, you acknowledge that:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>No platform content reduces or mitigates the inherent risks of aviation</li>
        <li>You assume full personal responsibility for all flight activities you undertake</li>
        <li><strong>SimPilot.ai</strong> is not a participant in your real-world flight activities and bears no responsibility for outcomes of those activities</li>
        <li>You will always follow the guidance of your certificated CFI over any information provided by this platform</li>
      </ul>

      <h2>9. Endorsement Tracking Disclaimer</h2>
      <p>
        The platform's endorsement tracking feature allows users to log endorsements received from certificated CFIs. These entries are <strong>TRAINING RECORDS ONLY</strong> for the user's personal reference.
      </p>
      <p>
        The actual legal endorsement is the CFI's signature in the user's official logbook or on FAA-approved forms. Platform records have <strong>NO legal weight</strong> regarding FAA certification status and cannot be presented to an FAA examiner, DPE, or any regulatory authority as evidence of endorsement.
      </p>

      <h2>10. Intellectual Property</h2>
      <p>
        All content delivered by the Service — including software, AI models, prompts, question banks, lesson content, scenarios, design, and trademarks — is owned by SimPilot.ai or licensed to us.
      </p>
      <p>
        You receive a limited, non-exclusive, non-transferable, revocable license to use the Service for your personal pilot training only. AI-generated content produced during your sessions (debriefs, evaluations, transcripts) is owned by SimPilot.ai; you receive a perpetual license to use it for your own personal training records.
      </p>
      <p>You may not resell, redistribute, or use AI outputs to train a competing AI system.</p>

      <h2>11. Instructor & School Accounts</h2>
      <p>
        Flight School and instructor accounts may view student progress, oral debriefs, scenario history, ATC sessions, and quiz attempts for students assigned to them. Students are notified of this visibility during onboarding.
      </p>
      <p>
        Instructors are bound by the same Acceptable Use rules and may not export student personally identifiable information (PII) outside the platform without explicit written consent from the student.
      </p>

      <h2>12. Termination</h2>
      <p>You may delete your account at any time from account settings. We may suspend or terminate accounts that:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Violate these Terms</li>
        <li>Abuse or attempt to circumvent the Service</li>
        <li>Initiate chargebacks without first contacting support</li>
        <li>Pose a security or legal risk to the platform or other users</li>
      </ul>
      <p>On termination, your access ends immediately. We may retain backup copies as required by applicable law.</p>

      <h2>13. Disclaimer of Warranties</h2>
      <p className="uppercase tracking-wide text-xs">
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT AI-GENERATED CONTENT IS ACCURATE OR COMPLETE. SIMPILOT.AI DOES NOT WARRANT THAT THE SERVICE WILL HELP YOU PASS ANY FAA KNOWLEDGE TEST, ORAL EXAM, OR PRACTICAL TEST (CHECKRIDE).
      </p>

      <h2>14. Limitation of Liability</h2>
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <p className="!text-foreground uppercase tracking-wide text-xs">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SIMPILOT.AI'S TOTAL CUMULATIVE LIABILITY FOR ANY CLAIM ARISING FROM OR RELATED TO YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE GREATER OF:
        </p>
        <ul className="list-disc pl-6 space-y-1 !text-foreground">
          <li>(a) USD $100.00, OR</li>
          <li>(b) The total subscription fees you paid to SimPilot.ai in the 12 months immediately preceding the event giving rise to the claim.</li>
        </ul>
        <p className="!text-foreground">
          THIS LIMITATION APPLIES regardless of legal theory (contract, tort, negligence, strict liability) and applies to all categories of damages including direct, indirect, incidental, consequential, special, exemplary, or punitive damages, loss of profits, loss of data, or any aviation incident, accident, regulatory violation, or failed examination.
        </p>
        <p className="!text-foreground">
          <strong>You acknowledge that aviation involves inherent risks and that the pilot in command bears sole and final responsibility for the safe conduct of every flight.</strong>
        </p>
      </div>

      <h2>15. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless SimPilot.ai, its officers, directors, employees, contractors, and affiliates from any claims, damages, losses, liabilities, costs, or expenses (including reasonable attorneys' fees) arising from:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>(a) Your use of or inability to use the platform</li>
        <li>(b) Your violation of these Terms</li>
        <li>(c) Your violation of any applicable law, regulation, or third-party right</li>
        <li>(d) Your reliance on platform content for real-world flight decisions</li>
        <li>(e) Any injury, accident, incident, or property damage occurring during or related to your aviation activities, regardless of whether platform content was a contributing factor</li>
        <li>(f) Content you upload to the platform, including any aircraft documentation</li>
      </ul>

      <h2>16. Class Action Waiver</h2>
      <p>
        You and SimPilot.ai agree that any dispute will be resolved on an individual basis only. <strong>YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT, CLASS ARBITRATION, OR REPRESENTATIVE PROCEEDING AGAINST SIMPILOT.AI.</strong> Where this waiver is unenforceable under applicable law, this clause is severable and the remainder of these Terms remains in full force and effect.
      </p>

      <h2>17. Force Majeure</h2>
      <p>
        SimPilot.ai is not liable for any delay or failure to perform resulting from causes beyond our reasonable control, including but not limited to: AI provider outages or API changes, internet infrastructure failures, natural disasters, acts of government or regulatory action, pandemic, war, or any other event outside our reasonable control.
      </p>

      <h2>18. Governing Law & Dispute Resolution</h2>

      <h3>18.1 Governing Law</h3>
      <p>
        These Terms are governed by the laws of the State of California, USA, without regard to conflict of laws principles.
      </p>

      <h3>18.2 Informal Resolution</h3>
      <p>
        Before initiating any formal proceeding, you agree to first contact us at <a href="mailto:support@simpilot.ai" className="text-primary hover:underline">support@simpilot.ai</a> and attempt to resolve the dispute informally. We will make good-faith efforts to resolve complaints within 30 days.
      </p>

      <h3>18.3 Binding Arbitration</h3>
      <p>
        Unresolved disputes shall be settled by binding arbitration in San Diego, California, under the rules of the American Arbitration Association (AAA). The arbitration shall be conducted by a single arbitrator. The arbitrator's award shall be final and binding, and judgment may be entered in any court of competent jurisdiction.
      </p>

      <h3>18.4 Small Claims Exception</h3>
      <p>
        Either party may bring an individual claim in small claims court in San Diego County, California, provided the claim qualifies under that court's jurisdictional limits.
      </p>

      <h3>18.5 Class Action Waiver</h3>
      <p>The class action waiver in Section 16 applies to all arbitration proceedings under this section.</p>

      <h2>19. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced via email or in-app notice at least 14 days before they take effect. Continued use of the Service after the effective date constitutes your acceptance of the updated Terms.
      </p>
      <p>
        You can always view the current version and historical versions of these Terms at <a href="https://simpilot.ai/terms" className="text-primary hover:underline">https://simpilot.ai/terms</a>.
      </p>

      <h2>20. Miscellaneous</h2>

      <h3>20.1 Entire Agreement</h3>
      <p>
        These Terms, together with our Privacy Policy and Aviation Disclaimer, constitute the entire agreement between you and SimPilot.ai regarding the Service.
      </p>

      <h3>20.2 Severability</h3>
      <p>If any provision of these Terms is found unenforceable, the remaining provisions continue in full force and effect.</p>

      <h3>20.3 No Waiver</h3>
      <p>Our failure to enforce any right or provision of these Terms is not a waiver of that right or provision.</p>

      <h3>20.4 Assignment</h3>
      <p>
        You may not assign your rights or obligations under these Terms without our written consent. SimPilot.ai may assign these Terms in connection with a merger, acquisition, or sale of assets.
      </p>

      <h2>21. Contact</h2>
      <p>For questions about these Terms:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>General support: <a href="mailto:support@simpilot.ai" className="text-primary hover:underline">support@simpilot.ai</a></li>
        <li>Legal questions: <a href="mailto:legal@simpilot.ai" className="text-primary hover:underline">legal@simpilot.ai</a></li>
        <li>Privacy: <a href="mailto:privacy@simpilot.ai" className="text-primary hover:underline">privacy@simpilot.ai</a></li>
        <li>Website: <a href="https://simpilot.ai" className="text-primary hover:underline">https://simpilot.ai</a></li>
      </ul>

      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
        <h3 className="!mt-0">Acknowledgment</h3>
        <p className="!text-foreground">
          By creating an account on SimPilot.ai — whether free, trial, or paid — you confirm that you have read, understood, and agree to all Terms above. You specifically acknowledge:
        </p>
        <ul className="list-disc pl-6 space-y-1 !text-foreground">
          <li>(a) SimPilot.ai is not FAA-approved and is not a substitute for instruction by a Certificated Flight Instructor.</li>
          <li>(b) AI responses may contain errors, and you will verify all safety-critical information against authoritative sources before acting on it.</li>
          <li>(c) You are Pilot in Command (or a student under direct CFI supervision) and bear full responsibility for any decision made in or around an aircraft.</li>
          <li>(d) You agree to the limitation of liability in Section 14, the class action waiver in Section 16, and the dispute resolution process in Section 18.</li>
        </ul>
      </div>

      <p className="text-xs text-muted-foreground italic text-center">© 2026 SimPilot.ai. All rights reserved.</p>
    </div>
  );
};

export default TermsContent;
