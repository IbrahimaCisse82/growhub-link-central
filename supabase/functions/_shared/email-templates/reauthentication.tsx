/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirmer votre identité</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expirera bientôt. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0d1f2e', margin: '0 0 20px', fontFamily: 'Syne, Arial, sans-serif' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 700 as const, color: '#00a283', letterSpacing: '4px', margin: '0 0 30px', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', textAlign: 'center' as const }
const footer = { fontSize: '11px', color: '#94a3b8', margin: '32px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
