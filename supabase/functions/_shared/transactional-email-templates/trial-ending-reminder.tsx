/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SimPilot.AI'
const SITE_URL = 'https://simpilot.ai'

interface TrialEndingReminderProps {
  name?: string
  hoursRemaining?: number
  groundSchoolModules?: number
  atcSessions?: number
  examAttempts?: number
  flightLogs?: number
}

const TrialEndingReminderEmail = ({
  name,
  hoursRemaining = 24,
  groundSchoolModules = 0,
  atcSessions = 0,
  examAttempts = 0,
  flightLogs = 0,
}: TrialEndingReminderProps) => {
  // Build a small recap line from non-zero stats
  const stats: string[] = []
  if (groundSchoolModules > 0)
    stats.push(`${groundSchoolModules} Ground One-on-One module${groundSchoolModules === 1 ? '' : 's'}`)
  if (atcSessions > 0)
    stats.push(`${atcSessions} ATC flight${atcSessions === 1 ? '' : 's'}`)
  if (examAttempts > 0)
    stats.push(`${examAttempts} oral exam attempt${examAttempts === 1 ? '' : 's'}`)
  if (flightLogs > 0)
    stats.push(`${flightLogs} logbook entr${flightLogs === 1 ? 'y' : 'ies'}`)
  const recap = stats.length > 0 ? stats.join(' • ') : null

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {`Your ${SITE_NAME} trial ends in ~${hoursRemaining} hours — keep your CFI-AI flying.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
            <Img
              src={`${SITE_URL}/logo.svg`}
              alt={`${SITE_NAME} logo`}
              width="220"
              style={{ display: 'inline-block', maxWidth: '100%', height: 'auto' }}
            />
          </Section>

          <Section style={alertBanner}>
            <Text style={alertText}>⏱️ Your free trial ends in ~{hoursRemaining} hours</Text>
          </Section>

          <Heading style={h1}>
            {name ? `${name}, don't lose your altitude.` : `Don't lose your altitude.`}
          </Heading>
          <Text style={text}>
            Your 7-day SimPilot trial wraps up tomorrow. Choose <strong>Pro</strong> or{' '}
            <strong>Ultra</strong> to keep your AI Senior CFI on the radio — or your access
            will pause until you select a plan.
          </Text>

          {recap && (
            <Section style={recapCard}>
              <Text style={recapLabel}>📊 Your trial so far</Text>
              <Text style={recapValue}>{recap}</Text>
            </Section>
          )}

          {/* Plans side-by-side */}
          <Section style={{ margin: '28px 0 8px' }}>
            <Row>
              <Column style={planColLeft}>
                <Section style={planCardPro}>
                  <Text style={planBadge}>★ MOST POPULAR</Text>
                  <Heading as="h2" style={planName}>SimPilot Pro</Heading>
                  <Text style={planPrice}>
                    $59<span style={planPriceUnit}>/month</span>
                  </Text>
                  <Text style={planTag}>Active student & private pilots</Text>
                  <Text style={planFeature}>✓ Unlimited AI coaching</Text>
                  <Text style={planFeature}>✓ POH upload & aircraft answers</Text>
                  <Text style={planFeature}>✓ VFR/IFR chart image analysis</Text>
                  <Text style={planFeature}>✓ Sim debrief (.FLT files)</Text>
                  <Text style={planFeature}>✓ Unlimited session history</Text>
                  <Section style={{ textAlign: 'center' as const, margin: '14px 0 4px' }}>
                    <Button style={buttonPrimary} href={`${SITE_URL}/dashboard?plan=pro`}>
                      Choose Pro
                    </Button>
                  </Section>
                </Section>
              </Column>
              <Column style={planColRight}>
                <Section style={planCardUltra}>
                  <Text style={planBadge}>★ FOR CFIs</Text>
                  <Heading as="h2" style={planName}>SimPilot Ultra</Heading>
                  <Text style={planPrice}>
                    $99<span style={planPriceUnit}>/month</span>
                  </Text>
                  <Text style={planTag}>Checkride-ready pilots & CFIs</Text>
                  <Text style={planFeature}>✓ Everything in Pro</Text>
                  <Text style={planFeature}>✓ Custom training scenarios</Text>
                  <Text style={planFeature}>✓ 24/7 priority 1-on-1 support</Text>
                  <Text style={planFeature}>✓ Checkride readiness analytics</Text>
                  <Text style={planFeature}>✓ Multi-aircraft POH library</Text>
                  <Section style={{ textAlign: 'center' as const, margin: '14px 0 4px' }}>
                    <Button style={buttonSecondary} href={`${SITE_URL}/dashboard?plan=ultra`}>
                      Choose Ultra
                    </Button>
                  </Section>
                </Section>
              </Column>
            </Row>
          </Section>

          <Text style={smallText}>
            Cancel anytime. 14-day money-back guarantee. Need help choosing?{' '}
            <Link href={`${SITE_URL}/contact`} style={link}>Talk to us</Link>.
          </Text>

          <Hr style={hr} />
          <Text style={disclaimer}>
            ⚠️ {SITE_NAME} is a supplemental study aid and is not FAA-approved. Under §91.3,
            the pilot in command is the final authority. AI may produce errors — always verify
            with your CFI and official FAA publications.
          </Text>
          <Text style={footer}>Clear skies, The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialEndingReminderEmail,
  subject: (data: Record<string, any>) =>
    `⏱️ ${data?.hoursRemaining ?? 24}h left in your ${SITE_NAME} trial — pick your plan`,
  displayName: 'Trial ending in 24h reminder',
  previewData: {
    name: 'Jane',
    hoursRemaining: 24,
    groundSchoolModules: 3,
    atcSessions: 5,
    examAttempts: 2,
    flightLogs: 1,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px' }
const alertBanner = {
  backgroundColor: '#fff7ed',
  border: '1px solid #fdba74',
  borderRadius: '8px',
  padding: '10px 16px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const alertText = {
  fontSize: '13px',
  color: '#9a3412',
  fontWeight: 'bold' as const,
  margin: 0,
  letterSpacing: '0.02em',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#151d2b',
  margin: '0 0 16px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '14px',
  color: '#535b6a',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const smallText = {
  fontSize: '12px',
  color: '#7a8290',
  lineHeight: '1.5',
  margin: '20px 0 0',
  textAlign: 'center' as const,
}
const recapCard = {
  backgroundColor: '#f5f9fa',
  border: '1px solid #e1eaec',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '8px 0 8px',
}
const recapLabel = {
  fontSize: '11px',
  color: '#7a8290',
  fontWeight: 'bold' as const,
  margin: '0 0 4px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
}
const recapValue = {
  fontSize: '14px',
  color: '#151d2b',
  fontWeight: 'bold' as const,
  margin: 0,
}
const planColLeft = { width: '50%', paddingRight: '6px', verticalAlign: 'top' as const }
const planColRight = { width: '50%', paddingLeft: '6px', verticalAlign: 'top' as const }
const planCardPro = {
  border: '2px solid #009199',
  borderRadius: '10px',
  padding: '16px 14px',
  backgroundColor: '#ffffff',
}
const planCardUltra = {
  border: '1px solid #d6b85a',
  borderRadius: '10px',
  padding: '16px 14px',
  backgroundColor: '#fffbf2',
}
const planBadge = {
  fontSize: '10px',
  color: '#009199',
  fontWeight: 'bold' as const,
  letterSpacing: '0.1em',
  margin: '0 0 6px',
}
const planName = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#151d2b',
  margin: '0 0 4px',
}
const planPrice = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#151d2b',
  margin: '0 0 2px',
}
const planPriceUnit = { fontSize: '12px', color: '#7a8290', fontWeight: 'normal' as const }
const planTag = {
  fontSize: '11px',
  color: '#7a8290',
  margin: '0 0 12px',
}
const planFeature = {
  fontSize: '12px',
  color: '#535b6a',
  margin: '0 0 4px',
  lineHeight: '1.5',
}
const buttonPrimary = {
  backgroundColor: '#009199',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  borderRadius: '6px',
  padding: '10px 18px',
  textDecoration: 'none',
}
const buttonSecondary = {
  backgroundColor: '#151d2b',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  borderRadius: '6px',
  padding: '10px 18px',
  textDecoration: 'none',
}
const link = { color: '#009199', textDecoration: 'underline' }
const hr = { borderColor: '#e1eaec', margin: '28px 0 20px' }
const disclaimer = {
  fontSize: '11px',
  color: '#7a8290',
  lineHeight: '1.5',
  margin: '0 0 16px',
  fontStyle: 'italic' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
