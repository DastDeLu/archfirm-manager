import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireUser, stampOwnerExtra, withAuth } from '../_lib/authz.ts';

// Security note: the user identity used to store the calendar token is resolved
// exclusively from the authenticated session (auth.me()), not from the `state`
// parameter supplied by the OAuth redirect. This prevents an attacker from
// associating a stolen OAuth code with an arbitrary account by manipulating state.
Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);

  // Resolve the authenticated caller from the session — ignore any user identity
  // claim that may arrive in the request body or query string.
  const user = await requireUser(base44);

  const { code, error: oauthError } = await req.json();

  if (oauthError) {
    return Response.json({ error: 'OAuth denied: ' + oauthError }, { status: 400 });
  }

  if (!code) {
    return Response.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI');

  if (!clientId || !clientSecret || !redirectUri) {
    return Response.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

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
    return Response.json(
      { error: 'No refresh_token received. User may need to re-authorize.' },
      { status: 400 },
    );
  }

  const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

  // Use the session-verified email — never the client-supplied state.
  const userEmail = user.email;

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
      ...stampOwnerExtra(user.id),
    });
  }

  return Response.json({ success: true, message: 'Google Calendar connesso con successo' });
}));
