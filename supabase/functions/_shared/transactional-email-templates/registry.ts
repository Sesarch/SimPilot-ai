/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as newsletterConfirmation } from './newsletter-confirmation.tsx'
import { template as welcomeSignup } from './welcome-signup.tsx'
import { template as intakeConfirmation } from './intake-confirmation.tsx'
import { template as trialEndingReminder } from './trial-ending-reminder.tsx'
import { template as intakeTeamNotification } from './intake-team-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'newsletter-confirmation': newsletterConfirmation,
  'welcome-signup': welcomeSignup,
  'intake-confirmation': intakeConfirmation,
  'trial-ending-reminder': trialEndingReminder,
  'intake-team-notification': intakeTeamNotification,
}
