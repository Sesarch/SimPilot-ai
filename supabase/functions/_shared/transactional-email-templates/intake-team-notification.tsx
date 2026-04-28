/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SimPilot.AI'

interface IntakeTeamNotificationProps {
  audience?: 'pilot' | 'school'
  contactName?: string
  contactEmail?: string
  schoolName?: string
  trainingGoals?: string
  source?: string
}

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <Text style={row}>
      <span style={rowLabel}>{label}: </span>
      <span style={rowValue}>{value}</span>
    </Text>
  ) : null

const IntakeTeamNotificationEmail = ({
  audience,
  contactName,
  contactEmail,
  schoolName,
  trainingGoals,
  source,
}: IntakeTeamNotificationProps) => {
  const audienceLabel = audience === 'school' ? 'Flight School' : 'Individual Pilot'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New {audienceLabel} lead — {contactName ?? contactEmail ?? 'unknown'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New {audienceLabel} lead</Heading>
          <Text style={text}>A new lead just submitted the intake form on {SITE_NAME}.</Text>
          <Section style={card}>
            <Row label="Audience" value={audienceLabel} />
            <Row label="Name" value={contactName} />
            <Row label="Email" value={contactEmail} />
            <Row label="School" value={schoolName} />
            <Row label="Training goals" value={trainingGoals} />
            <Row label="Source" value={source} />
          </Section>
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={footer}>Reply directly to {contactEmail ?? 'the lead'} to follow up.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: IntakeTeamNotificationEmail,
  subject: (data: Record<string, any>) => {
    const audienceLabel = data?.audience === 'school' ? 'Flight School' : 'Pilot'
    const who = data?.contactName || data?.contactEmail || 'unknown'
    return `[Lead] New ${audienceLabel} intake — ${who}`
  },
  displayName: 'Intake — team notification',
  previewData: {
    audience: 'school',
    contactName: 'Jane Doe',
    contactEmail: 'jane@example.com',
    schoolName: 'Skyline Aviation',
    trainingGoals: 'Onboard 25 students for PPL ground school',
    source: 'homepage',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#151d2b', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#535b6a', lineHeight: '1.5', margin: '0 0 16px' }
const card = {
  backgroundColor: '#f7f9fb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px 18px',
}
const row = { fontSize: '14px', color: '#151d2b', lineHeight: '1.5', margin: '0 0 8px' }
const rowLabel = { color: '#6b7280', fontWeight: 600 as const }
const rowValue = { color: '#151d2b' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
