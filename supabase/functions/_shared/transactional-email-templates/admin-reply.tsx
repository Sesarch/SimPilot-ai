/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SimPilot.AI'
const SITE_URL = 'https://simpilot.ai'

interface Props {
  name?: string
  subject?: string
  body?: string
  agent_name?: string
}

const AdminReplyEmail = ({ name, subject, body, agent_name }: Props) => {
  const paragraphs = (body || '').split(/\n{2,}/).map((p) => p.replace(/\n/g, ' '))
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject || `Reply from the ${SITE_NAME} team`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
            <Img src={`${SITE_URL}/email-logo.png`} alt={`${SITE_NAME} logo`} width="200" style={{ display: 'inline-block', maxWidth: '100%', height: 'auto' }} />
          </Section>
          <Heading style={h1}>{name ? `Hi ${name},` : 'Hello,'}</Heading>
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>{p}</Text>
          ))}
          <Hr style={hr} />
          <Text style={footer}>
            {agent_name || 'The SimPilot.AI Team'}<br />
            Clear skies ✈️
          </Text>
          <Text style={footerSmall}>
            Reply to this email and we'll see it in our inbox.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminReplyEmail,
  subject: (data: Record<string, any>) =>
    data?.subject ? `Re: ${data.subject}` : `Reply from ${SITE_NAME}`,
  displayName: 'Admin reply',
  previewData: { name: 'Jane', subject: 'About my trial', body: 'Hi Jane,\n\nThanks for reaching out!', agent_name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#151d2b', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#2d3748', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e7eb', margin: '28px 0 16px' }
const footer = { fontSize: '14px', color: '#535b6a', margin: '0 0 12px' }
const footerSmall = { fontSize: '12px', color: '#999', margin: '20px 0 0' }
