import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client();

export async function verifyGoogleToken(token: string) {
    console.log('Verifying Google token...');
    console.log(process.env.GOOGLE_CLIENT_ID); // Verifica que el token no esté vacío o nulo
    console.log(token); // Verifica que el token no esté vacío o nulo
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload(); // contiene email, sub (user ID), name, etc.
}
