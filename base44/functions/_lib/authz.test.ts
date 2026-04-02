/**
 * Unit tests for the shared authorization utilities.
 * Run with: deno test base44/functions/_lib/authz.test.ts
 */

import {
  assertEquals,
  assertRejects,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  AuthError,
  assertOwned,
  requireUser,
  requireWebhookSecret,
  stampOwnerExtra,
  withAuth,
} from './authz.ts';

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

Deno.test('AuthError carries the correct status code', () => {
  const err = new AuthError('Unauthorized', 401);
  assertEquals(err.message, 'Unauthorized');
  assertEquals(err.status, 401);
  assertEquals(err.name, 'AuthError');
});

// ---------------------------------------------------------------------------
// requireUser
// ---------------------------------------------------------------------------

Deno.test('requireUser returns the user when auth.me() succeeds', async () => {
  const mockBase44 = { auth: { me: async () => ({ id: 'user_1', email: 'a@b.com' }) } };
  const user = await requireUser(mockBase44);
  assertEquals(user.id, 'user_1');
});

Deno.test('requireUser throws AuthError(401) when auth.me() returns null', async () => {
  const mockBase44 = { auth: { me: async () => null } };
  await assertRejects(
    () => requireUser(mockBase44),
    AuthError,
    'Unauthorized',
  );
});

// ---------------------------------------------------------------------------
// assertOwned
// ---------------------------------------------------------------------------

Deno.test('assertOwned passes when owner_user_id matches', () => {
  assertOwned({ owner_user_id: 'user_1' }, 'user_1');
});

Deno.test('assertOwned passes when owner_user_id is undefined (pre-migration record)', () => {
  assertOwned({ some_field: 'value' }, 'user_1');
});

Deno.test('assertOwned passes when owner_user_id is null (legacy row)', () => {
  assertOwned({ owner_user_id: null }, 'user_1');
});

Deno.test('assertOwned passes when owner_user_id is empty string', () => {
  assertOwned({ owner_user_id: '' }, 'user_1');
});

Deno.test('assertOwned throws AuthError(404) when owner_user_id belongs to another user', () => {
  const err = assertThrows(
    () => assertOwned({ owner_user_id: 'user_2' }, 'user_1'),
    AuthError,
  ) as AuthError;
  assertEquals(err.status, 404);
  assertEquals(err.message, 'Not found');
});

Deno.test('assertOwned throws AuthError(404) when record is null', () => {
  const err = assertThrows(() => assertOwned(null, 'user_1'), AuthError) as AuthError;
  assertEquals(err.status, 404);
});

Deno.test('assertOwned throws AuthError(404) when record is undefined', () => {
  const err = assertThrows(() => assertOwned(undefined, 'user_1'), AuthError) as AuthError;
  assertEquals(err.status, 404);
});

// ---------------------------------------------------------------------------
// requireWebhookSecret
// ---------------------------------------------------------------------------

function makeReq(secret?: string) {
  return new Request('http://localhost/', {
    method: 'POST',
    headers: secret ? { 'x-webhook-secret': secret } : {},
  });
}

Deno.test('requireWebhookSecret passes when secret matches env var', () => {
  Deno.env.set('WEBHOOK_SECRET', 'test-secret-123');
  requireWebhookSecret(makeReq('test-secret-123'));
  Deno.env.delete('WEBHOOK_SECRET');
});

Deno.test('requireWebhookSecret throws AuthError(403) when header is absent', () => {
  Deno.env.set('WEBHOOK_SECRET', 'test-secret-123');
  try {
    const err = assertThrows(() => requireWebhookSecret(makeReq()), AuthError) as AuthError;
    assertEquals(err.status, 403);
  } finally {
    Deno.env.delete('WEBHOOK_SECRET');
  }
});

Deno.test('requireWebhookSecret throws AuthError(403) when header does not match', () => {
  Deno.env.set('WEBHOOK_SECRET', 'test-secret-123');
  try {
    const err = assertThrows(() => requireWebhookSecret(makeReq('wrong-secret')), AuthError) as AuthError;
    assertEquals(err.status, 403);
  } finally {
    Deno.env.delete('WEBHOOK_SECRET');
  }
});

Deno.test('requireWebhookSecret does not throw when env var is not set (legacy mode)', () => {
  Deno.env.delete('WEBHOOK_SECRET');
  requireWebhookSecret(makeReq('any-value'));
  requireWebhookSecret(makeReq());
});

// ---------------------------------------------------------------------------
// stampOwnerExtra
// ---------------------------------------------------------------------------

Deno.test('stampOwnerExtra returns empty object when STAMP_OWNER_USER_ID is not true', () => {
  Deno.env.delete('STAMP_OWNER_USER_ID');
  assertEquals(Object.keys(stampOwnerExtra('user_1')).length, 0);
});

Deno.test('stampOwnerExtra adds owner_user_id when env is true', () => {
  Deno.env.set('STAMP_OWNER_USER_ID', 'true');
  try {
    assertEquals(stampOwnerExtra('abc'), { owner_user_id: 'abc' });
    assertEquals(Object.keys(stampOwnerExtra(null)).length, 0);
  } finally {
    Deno.env.delete('STAMP_OWNER_USER_ID');
  }
});

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

Deno.test('withAuth returns the handler response on success', async () => {
  const handler = withAuth(async (_req) => Response.json({ ok: true }));
  const res = await handler(new Request('http://localhost/'));
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
});

Deno.test('withAuth converts AuthError to the matching HTTP status', async () => {
  const handler = withAuth(async (_req) => {
    throw new AuthError('Unauthorized', 401);
  });
  const res = await handler(new Request('http://localhost/'));
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, 'Unauthorized');
});

Deno.test('withAuth converts AuthError(403) to 403 response', async () => {
  const handler = withAuth(async (_req) => {
    throw new AuthError('Forbidden', 403);
  });
  const res = await handler(new Request('http://localhost/'));
  assertEquals(res.status, 403);
});

Deno.test('withAuth converts AuthError(404) to 404 response', async () => {
  const handler = withAuth(async (_req) => {
    throw new AuthError('Not found', 404);
  });
  const res = await handler(new Request('http://localhost/'));
  assertEquals(res.status, 404);
});

Deno.test('withAuth converts general errors to 500', async () => {
  const handler = withAuth(async (_req) => {
    throw new Error('Something exploded');
  });
  const res = await handler(new Request('http://localhost/'));
  const body = await res.json();
  assertEquals(res.status, 500);
  assertEquals(body.error, 'Something exploded');
});
