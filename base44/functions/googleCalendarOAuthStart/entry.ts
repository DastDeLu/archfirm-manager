import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      return Response.json({ error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI secrets.' }, { status: 500 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events email',
      access_type: 'offline',
      prompt: 'consent',
      state: user.email, // pass email as state to identify user in callback
    });

    const auth_url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return Response.json({ auth_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});