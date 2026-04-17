/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SimPilot.AI'
const SITE_URL = 'https://simpilot.ai'

interface WelcomeSignupProps {
  name?: string
}

const WelcomeSignupEmail = ({ name }: WelcomeSignupProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome aboard {SITE_NAME} — your AI flight instructor is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <Img
            src={`${SITE_URL}/icon-512x512.png`}
            alt={`${SITE_NAME} logo`}
            width="64"
            height="64"
            style={{ borderRadius: '12px', display: 'inline-block' }}
          />
          <Text style={tagline}>Your AI Senior CFI</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Welcome aboard, ${name}! ✈️` : 'Welcome aboard, pilot! ✈️'}
        </Heading>
        <Text style={text}>
          Thanks for joining <strong>{SITE_NAME}</strong>. You now have access to your
          AI-powered Senior CFI — ready to help you train smarter, study faster, and fly safer.
        </Text>

        <Section style={card}>
          <Heading as="h2" style={h2}>Your preflight checklist</Heading>
          <Text style={listItem}>✅ <strong>Ground School</strong> — 19 modules mapped to FAA ACS standards</Text>
          <Text style={listItem}>✅ <strong>Oral Exam Prep</strong> — Practice with strict DPE-mode scenarios</Text>
          <Text style={listItem}>✅ <strong>Live Sky Tools</strong> — Real-time weather briefings and flight tracking</Text>
          <Text style={listItem}>✅ <strong>ATC Trainer</strong> — Sharpen your radio comms with interactive scenarios</Text>
        </Section>

        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <Button style={button} href={`${SITE_URL}/dashboard`}>
            Start Training
          </Button>
        </Section>

        <Text style={text}>
          Need a hand getting started? Just reply to this email or visit our{' '}
          <Link href={`${SITE_URL}/contact`} style={link}>support page</Link>.
        </Text>

        <Hr style={hr} />
        <Text style={disclaimer}>
          ⚠️ {SITE_NAME} is a supplemental study aid and is not FAA-approved. Always
          consult your CFI and official FAA publications for primary instruction.
        </Text>
        <Text style={footer}>Clear skies, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeSignupEmail,
  subject: 'Welcome to SimPilot.AI — your AI CFI is ready ✈️',
  displayName: 'Signup welcome email',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#151d2b',
  margin: '0 0 20px',
}
const h2 = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#151d2b',
  margin: '0 0 12px',
}
const text = {
  fontSize: '14px',
  color: '#535b6a',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const listItem = {
  fontSize: '14px',
  color: '#535b6a',
  lineHeight: '1.6',
  margin: '0 0 8px',
}
const card = {
  backgroundColor: '#f5f9fa',
  border: '1px solid #e1eaec',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
}
const button = {
  backgroundColor: '#009199',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 28px',
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
