/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Grow Hub Management System'

interface ReminderProps {
  inviteUrl?: string
  roleLabel?: string
  daysRemaining?: number
}

const ReminderEmail = ({ inviteUrl, roleLabel, daysRemaining }: ReminderProps) => (
  <Html lang="fr">
    <Head />
    <Preview>Rappel : votre invitation à {SITE_NAME} expire bientôt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⏰ Rappel d'invitation</Heading>
        <Text style={text}>
          Vous avez été invité à rejoindre <strong>{SITE_NAME}</strong>
          {roleLabel ? ` en tant que ${roleLabel}` : ''}, mais vous n'avez pas encore activé votre compte.
        </Text>
        {daysRemaining !== undefined && (
          <Text style={highlight}>
            Votre invitation expire dans <strong>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong>.
          </Text>
        )}
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={inviteUrl} style={button}>
            Activer mon compte
          </Button>
        </Section>
        <Text style={small}>
          Lien direct : <span style={{ color: '#00a283', wordBreak: 'break-all' }}>{inviteUrl}</span>
        </Text>
        <Text style={footer}>
          Si vous ne souhaitez pas rejoindre la plateforme, vous pouvez ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReminderEmail,
  subject: `Rappel : votre invitation à ${SITE_NAME} expire bientôt`,
  displayName: 'Rappel d\'invitation',
  previewData: { inviteUrl: 'https://app.growhub.com/login?token=abc', roleLabel: 'Coordinateur', daysRemaining: 3 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0d1f2e', margin: '0 0 20px', fontFamily: 'Syne, Arial, sans-serif' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const highlight = { fontSize: '15px', color: '#0d1f2e', backgroundColor: '#fef3c7', padding: '12px 16px', borderRadius: '8px', margin: '0 0 16px' }
const small = { fontSize: '12px', color: '#64748b', lineHeight: '1.5', margin: '24px 0 0' }
const footer = { fontSize: '11px', color: '#94a3b8', margin: '32px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
const button = { backgroundColor: '#00a283', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
