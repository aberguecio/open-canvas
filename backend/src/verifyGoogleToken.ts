import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client();

export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return null;
    }

    // Check if user is banned
    const { prisma } = await import('./prisma');
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (user?.isBanned) {
      console.log('Banned user attempted to login:', payload.email);
      return null; // Reject authentication for banned users
    }

    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}
