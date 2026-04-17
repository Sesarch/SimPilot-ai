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

const SITE_NAME = "SimPilot.AI"
const SITE_URL = 'https://simpilot.ai'

interface ContactConfirmationProps {
  name?: string
}

const ContactConfirmationEmail = ({ name }: ContactConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Message received — your {SITE_NAME} crew is on it ✈️</Preview>
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
          {name ? `Thank you, ${name}!` : 'Thank you for reaching out!'}
        </Heading>
        <Text style={text}>
          We've received your message and our team will get back to you as soon as possible.
        </Text>
        <Text style={text}>
          In the meantime, feel free to explore our AI-powered ground school and oral exam prep tools.
        </Text>
        <Text style={footer}>Clear skies, The {SITE_NAME} crew ✈️</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'Thanks for contacting SimPilot.AI',
  displayName: 'Contact form confirmation',
  previewData: { name: 'Jane' },
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

const tagline = { fontSize: '13px', fontWeight: 'bold' as const, color: '#009199', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '14px 0 0', textAlign: 'center' as const }
