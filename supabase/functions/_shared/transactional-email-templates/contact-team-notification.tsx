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

interface ContactTeamNotificationProps {
  name?: string
  email?: string
  subject?: string
  message?: string
}

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <Text style={row}>
      <span style={rowLabel}>{label}: </span>
      <span style={rowValue}>{value}</span>
    </Text>
  ) : null

const ContactTeamNotificationEmail = ({
  name,
  email,
  subject,
  message,
}: ContactTeamNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact form message — {name ?? email ?? 'unknown'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New contact form message</Heading>
        <Text style={text}>Someone just submitted the contact form on {SITE_NAME}.</Text>
        <Section style={card}>
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Subject" value={subject} />
        </Section>
        {message ? (
          <>
            <Text style={{ ...text, marginTop: '20px', fontWeight: 600, color: '#151d2b' }}>
              Message
            </Text>
            <Section style={messageBox}>
              <Text style={{ ...row, whiteSpace: 'pre-wrap' as const }}>{message}</Text>
            </Section>
          </>
        ) : null}
        <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
        <Text style={footer}>Reply directly to {email ?? 'the sender'} to follow up.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactTeamNotificationEmail,
  subject: (data: Record<string, any>) => {
    const who = data?.name || data?.email || 'unknown'
    const subj = data?.subject ? ` — ${data.subject}` : ''
    return `[Contact] ${who}${subj}`
  },
  to: 'support@simpilot.ai',
  displayName: 'Contact form — team notification',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Question about ground school',
    message: 'Hi, I have a question about your PPL prep modules...',
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
const messageBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderLeft: '3px solid #009199',
  borderRadius: '6px',
  padding: '14px 16px',
}
const row = { fontSize: '14px', color: '#151d2b', lineHeight: '1.5', margin: '0 0 8px' }
const rowLabel = { color: '#6b7280', fontWeight: 600 as const }
const rowValue = { color: '#151d2b' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
