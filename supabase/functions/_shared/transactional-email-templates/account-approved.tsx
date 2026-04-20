/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'GrowHub Accelerator'

interface ApprovedProps {
  appUrl?: string
  fullName?: string
}

const ApprovedEmail = ({ appUrl, fullName }: ApprovedProps) => (
  <Html lang="fr">
    <Head />
    <Preview>Votre compte {SITE_NAME} est activé</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✓ Compte approuvé</Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : 'Bonjour,'}
        </Text>
        <Text style={text}>
          Votre compte sur <strong>{SITE_NAME}</strong> a été approuvé par un administrateur.
          Vous pouvez désormais vous connecter et accéder à toutes les fonctionnalités.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={appUrl} style={button}>
            Accéder à la plateforme
          </Button>
        </Section>
        <Text style={footer}>
          Une question ? Contactez votre administrateur.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApprovedEmail,
  subject: `Votre compte ${SITE_NAME} est activé`,
  displayName: 'Compte approuvé',
  previewData: { appUrl: 'https://app.growhub.com', fullName: 'Mamadou Diop' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0d1f2e', margin: '0 0 20px', fontFamily: 'Syne, Arial, sans-serif' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '11px', color: '#94a3b8', margin: '32px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
const button = { backgroundColor: '#00a283', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
