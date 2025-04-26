import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client();

export async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload(); // contiene email, sub (user ID), name, etc.
}
