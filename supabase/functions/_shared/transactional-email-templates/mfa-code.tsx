/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SimPilot.AI'
const SITE_URL = 'https://simpilot.ai'

interface MfaCodeProps {
  code: string
  expiresInMinutes?: number
}

const MfaCodeEmail = ({ code, expiresInMinutes = 10 }: MfaCodeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} verification code: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <Img src={`${SITE_URL}/logo.svg`} alt={`${SITE_NAME} logo`} width="200" style={{ display: 'inline-block', maxWidth: '100%', height: 'auto' }} />
        </Section>
        <Heading style={h1}>Your verification code</Heading>
        <Text style={text}>
          Use the code below to finish signing in. It expires in {expiresInMinutes} minutes.
        </Text>
        <Section style={codeWrap}>
          <Text style={codeStyle}>{code}</Text>
        </Section>
        <Text style={muted}>
          If you didn't try to sign in, you can safely ignore this email — but consider changing your password.
        </Text>
        <Text style={footer}>Clear skies, the {SITE_NAME} crew ✈️</Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: MfaCodeEmail,
  subject: (d) => `Your ${SITE_NAME} code: ${d.code}`,
  displayName: 'MFA Verification Code',
  previewData: { code: '123456', expiresInMinutes: 10 },
}

export default MfaCodeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a1628', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4a5363', lineHeight: '1.6', margin: '0 0 20px' }
const codeWrap = { textAlign: 'center' as const, margin: '24px 0' }
const codeStyle = {
  display: 'inline-block',
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#009199',
  letterSpacing: '8px',
  padding: '16px 24px',
  background: '#f1f5f7',
  borderRadius: '8px',
  margin: 0,
}
const muted = { fontSize: '12px', color: '#7a8290', lineHeight: '1.5', margin: '20px 0 0' }
const footer = { fontSize: '12px', color: '#9aa1ac', margin: '24px 0 0' }
