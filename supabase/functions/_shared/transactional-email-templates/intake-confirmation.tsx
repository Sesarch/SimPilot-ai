/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SimPilot.AI'
const SITE_URL = 'https://simpilot.ai'

interface IntakeConfirmationProps {
  name?: string
  audience?: 'pilot' | 'school'
  schoolName?: string
}

const IntakeConfirmationEmail = ({ name, audience, schoolName }: IntakeConfirmationProps) => {
  const isSchool = audience === 'school'
  const greeting = name ? `Thanks, ${name}!` : 'Thanks for getting in touch!'
  const lead = isSchool
    ? `We've received the intake form for ${schoolName ?? 'your flight school'} and our team will follow up shortly with next steps for getting your students onboarded.`
    : "We've received your training intake. Your CFI-AI is being tuned to your goals, aircraft, and proficiency — you'll hear from us shortly with next steps."

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Intake received — {SITE_NAME} is preparing your training plan ✈️</Preview>
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
          <Heading style={h1}>{greeting}</Heading>
          <Text style={text}>{lead}</Text>
          <Text style={text}>
            In the meantime, feel free to explore our AI ground school, oral exam prep, and live tools.
          </Text>
          <Text style={footer}>Clear skies, The {SITE_NAME} crew ✈️</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: IntakeConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.audience === 'school'
      ? 'Your SimPilot.AI flight school intake — received'
      : 'Your SimPilot.AI training intake — received',
  displayName: 'Intake confirmation',
  previewData: { name: 'Jane', audience: 'pilot' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#151d2b',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#535b6a',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
