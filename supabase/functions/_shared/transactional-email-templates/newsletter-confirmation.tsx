import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SimPilot.AI'
const SITE_URL = 'https://simpilot.ai'

interface NewsletterConfirmationProps {
  email?: string
}

const NewsletterConfirmationEmail = ({ email }: NewsletterConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're cleared for takeoff — welcome to Pilot Briefings ✈️</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 20px' }}>
          <Img
            src={`${SITE_URL}/icon-512x512.png`}
            alt={`${SITE_NAME} logo`}
            width="64"
            height="64"
            style={{ borderRadius: '12px', display: 'inline-block' }}
          />
        </Section>
        <Section style={header}>
          <Text style={brandTag}>SIMPILOT.AI · PILOT BRIEFINGS</Text>
        </Section>
        <Heading style={h1}>You're on the list ✈️</Heading>
        <Text style={text}>
          Thanks for subscribing{email ? ` with ${email}` : ''} to <strong>Pilot Briefings</strong> —
          your monthly dispatch of aviation tips, study guides, and {SITE_NAME} updates.
        </Text>
        <Text style={text}>
          Expect concise, useful flight knowledge in your inbox. No spam, no fluff —
          just the stuff that helps you fly smarter and study sharper.
        </Text>
        <Hr style={hr} />
        <Text style={callout}>
          Cleared for takeoff. We'll see you on the next briefing.
        </Text>
        <Text style={footer}>— The {SITE_NAME} crew</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewsletterConfirmationEmail,
  subject: 'Welcome to Pilot Briefings ✈️',
  displayName: 'Newsletter confirmation',
  previewData: { email: 'pilot@example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const header = { marginBottom: '20px' }
const brandTag = {
  fontSize: '11px',
  letterSpacing: '0.25em',
  color: '#009199',
  fontWeight: 600,
  margin: 0,
}
const h1 = {
  fontSize: '26px',
  fontWeight: 'bold',
  color: '#0b1a2b',
  margin: '0 0 20px',
  fontFamily: 'Orbitron, Inter, Arial, sans-serif',
}
const text = { fontSize: '15px', color: '#3a4a5c', lineHeight: '1.6', margin: '0 0 18px' }
const hr = { borderColor: '#e2e8f0', margin: '28px 0' }
const callout = { fontSize: '14px', color: '#009199', fontWeight: 600, margin: '0 0 12px' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '20px 0 0' }

