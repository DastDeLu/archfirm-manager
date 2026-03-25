import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { code, state: userEmail, error: oauthError } = await req.json();

    if (oauthError) {
      return Response.json({ error: 'OAuth denied: ' + oauthError }, { status: 400 });
    }

    if (!code || !userEmail) {
      return Response.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      return Response.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return Response.json({ error: 'Token exchange failed: ' + err }, { status: 500 });
    }

    const { access_token, refresh_token, expires_in } = await tokenRes.json();

    if (!refresh_token) {
      return Response.json({ error: 'No refresh_token received. User may need to re-authorize.' }, { status: 400 });
    }

    const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    // Upsert UserCalendarToken
    const existing = await base44.asServiceRole.entities.UserCalendarToken.filter({ user_email: userEmail });

    if (existing.length > 0) {
      await base44.asServiceRole.entities.UserCalendarToken.update(existing[0].id, {
        access_token,
        refresh_token,
        token_expiry: tokenExpiry,
        connected_at: new Date().toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.UserCalendarToken.create({
        user_email: userEmail,
        access_token,
        refresh_token,
        token_expiry: tokenExpiry,
        calendar_id: 'primary',
        connected_at: new Date().toISOString(),
      });
    }

    return Response.json({ success: true, message: 'Google Calendar connesso con successo' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});