/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'GrowHub Accelerator'

interface InvitationProps {
  inviteUrl?: string
  roleLabel?: string
  inviterName?: string
}

const InvitationEmail = ({ inviteUrl, roleLabel, inviterName }: InvitationProps) => (
  <Html lang="fr">
    <Head />
    <Preview>Vous êtes invité à rejoindre {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bienvenue sur {SITE_NAME}</Heading>
        <Text style={text}>
          {inviterName ? `${inviterName} vous a invité` : 'Vous avez été invité'} à rejoindre la plateforme {SITE_NAME}
          {roleLabel ? ` en tant que ${roleLabel}.` : '.'}
        </Text>
        <Text style={text}>
          Cliquez sur le bouton ci-dessous pour créer votre compte et accéder à la plateforme.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={inviteUrl} style={button}>
            Accepter l'invitation
          </Button>
        </Section>
        <Text style={small}>
          Ou copiez ce lien dans votre navigateur : <br />
          <span style={{ color: '#00a283', wordBreak: 'break-all' }}>{inviteUrl}</span>
        </Text>
        <Text style={footer}>
          Cette invitation expire dans 7 jours. Si vous n'attendiez pas cet email, ignorez-le.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvitationEmail,
  subject: `Invitation à rejoindre ${SITE_NAME}`,
  displayName: 'Invitation utilisateur',
  previewData: { inviteUrl: 'https://app.growhub.com/login?token=abc', roleLabel: 'Coordinateur', inviterName: 'Ibrahima Cisse' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0d1f2e', margin: '0 0 20px', fontFamily: 'Syne, Arial, sans-serif' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: '#64748b', lineHeight: '1.5', margin: '24px 0 0' }
const footer = { fontSize: '11px', color: '#94a3b8', margin: '32px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
const button = { backgroundColor: '#00a283', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
