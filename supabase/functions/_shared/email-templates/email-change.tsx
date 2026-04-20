/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre changement d'email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirmation du changement d'email</Heading>
        <Text style={text}>
          Vous avez demandé à modifier votre adresse email pour {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          vers <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Cliquez sur le bouton ci-dessous pour confirmer ce changement :
        </Text>
        <Button style={button} href={confirmationUrl}>Confirmer le changement</Button>
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette demande, sécurisez immédiatement votre compte.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0d1f2e', margin: '0 0 20px', fontFamily: 'Syne, Arial, sans-serif' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#00a283', textDecoration: 'underline' }
const button = { backgroundColor: '#00a283', color: '#ffffff', fontSize: '14px', fontWeight: 600 as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block', margin: '12px 0' }
const footer = { fontSize: '11px', color: '#94a3b8', margin: '32px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
