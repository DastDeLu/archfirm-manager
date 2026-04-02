import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireUser, withAuth } from '../_lib/authz.ts';

Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireUser(base44);

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI');

  if (!clientId || !redirectUri) {
    return Response.json(
      { error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI secrets.' },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events email',
    access_type: 'offline',
    prompt: 'consent',
    state: user.email,
  });

  const auth_url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.json({ auth_url });
}));
