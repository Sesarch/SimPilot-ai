/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://simpilot.ai/icon-512x512.png'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new {siteName} email address ✈️</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <Img src={LOGO_URL} alt={`${siteName} logo`} width="64" height="64" style={{ borderRadius: '12px', display: 'inline-block' }} />
          <Text style={tagline}>Your AI Senior CFI</Text>
        </Section>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change your email address for {siteName} from{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Click the button below to confirm this change:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={footer}>
          Didn't request this change? Please secure your account immediately.
          <br />
          Clear skies, The {siteName} crew ✈️
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: '#009199', textDecoration: 'underline' }
const button = {
  backgroundColor: '#009199',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

const tagline = { fontSize: '13px', fontWeight: 'bold' as const, color: '#009199', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '14px 0 0', textAlign: 'center' as const }
