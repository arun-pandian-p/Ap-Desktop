#!/usr/bin/env node
/**
 * Ap Offline License Issuer CLI
 * Generates ECDSA P-256 signed license tokens bound to hardware fingerprints.
 * Usage: node tools/license-issuer/issue.js --holder "Arun Kumar" --fp "fp-8f92a3c74b1e"
 */

import crypto from 'crypto';

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Generate or load EC P-256 keypair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // P-256
});

const payload = {
  v: 1,
  kid: 'lic-2026-01',
  lid: crypto.randomUUID(),
  product: 'ap',
  edition: 'pro',
  features: ['python', 'sql', 'postgres', 'reports', 'analytics', 'offline_backup'],
  issued_at: new Date().toISOString(),
  not_before: new Date().toISOString(),
  expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
  max_version: '2.x',
  fp: 'fp-8f92a3c74b1e',
  holder: 'Arun Kumar (Developer Pro)',
};

// Canonical JSON: sorted keys, no whitespace
const canonicalPayload = JSON.stringify(payload, Object.keys(payload).sort());
const payloadB64 = base64url(Buffer.from(canonicalPayload, 'utf8'));

// Signature input: "ApLic1." || canonical_payload
const signInput = Buffer.from(`ApLic1.${canonicalPayload}`, 'utf8');
const sign = crypto.createSign('SHA256');
sign.update(signInput);
sign.end();
const signature = sign.sign(privateKey);
const signatureB64 = base64url(signature);

const licenseToken = `ApLic1.${payloadB64}.${signatureB64}`;

console.log('--- AP OFFLINE LICENSE ISSUER ---');
console.log('Holder:', payload.holder);
console.log('Edition:', payload.edition);
console.log('Fingerprint:', payload.fp);
console.log('Expires:', payload.expires_at);
console.log('\nGenerated License Token:\n');
console.log(licenseToken);
console.log('\n---------------------------------');
