/**
 * Shared authorization utilities for all Deno functions.
 *
 * Security principles enforced here:
 * - User identity is always resolved from the request token via auth.me(),
 *   never from client-supplied body or query parameters.
 * - Ownership checks return 404 (not 403) to avoid confirming the existence
 *   of resources belonging to other users (IDOR prevention).
 * - Webhook-triggered functions can verify a shared secret (X-Webhook-Secret). If the
 *   corresponding env var is not set, verification is skipped so existing deployments
 *   keep working until operators configure secrets.
 * - Optional owner_user_id stamping on entity writes is gated by STAMP_OWNER_USER_ID=true
 *   so schemas without that field are not broken.
 */

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Resolves the authenticated user from the SDK request context.
 * Throws AuthError(401) if no valid session is present.
 */
export async function requireUser(base44: any) {
  const user = await base44.auth.me();
  if (!user) throw new AuthError('Unauthorized', 401);
  return user;
}

/**
 * Asserts that a loaded record belongs to the calling user.
 *
 * The check is enforced only when `owner_user_id` is present on the record.
 * Records created before the owner migration have `owner_user_id` as undefined
 * and are temporarily skipped. After running the backfill migration in Base44
 * Dashboard, every record will have this field set and the check becomes strict.
 *
 * Returns 404 — not 403 — so unauthorised callers cannot confirm whether a
 * resource exists at all (IDOR mitigation).
 */
export function assertOwned(
  record: { owner_user_id?: string | null } | null | undefined,
  userId: string,
): void {
  if (!record) throw new AuthError('Not found', 404);
  // Only enforce when owner is explicitly set to a non-empty value (legacy rows stay open).
  const owner = record.owner_user_id;
  if (owner != null && owner !== '' && owner !== userId) {
    throw new AuthError('Not found', 404);
  }
}

/**
 * Adds owner_user_id to create/update payloads only when STAMP_OWNER_USER_ID === "true".
 * Keeps existing tenants working before the Base44 schema includes this field.
 */
export function stampOwnerExtra(ownerId: string | null | undefined): { owner_user_id: string } | Record<string, never> {
  if (Deno.env.get('STAMP_OWNER_USER_ID') !== 'true') return {};
  if (ownerId == null || ownerId === '') return {};
  return { owner_user_id: ownerId };
}

/**
 * Verifies the X-Webhook-Secret request header against the environment variable
 * named by `envKey` (default: WEBHOOK_SECRET).
 *
 * Use this for functions triggered by internal platform automations or webhooks
 * where no end-user JWT is available. Configure the secret value in
 * Base44 Dashboard → Secrets and send it as `X-Webhook-Secret` on every trigger.
 *
 * Legacy / bootstrap: if the env var is unset or empty, verification is skipped and a
 * warning is logged once per env key so webhooks keep working until you configure secrets.
 */
const _webhookLegacyWarned = new Set<string>();

export function requireWebhookSecret(req: Request, envKey = 'WEBHOOK_SECRET'): void {
  const expected = Deno.env.get(envKey)?.trim();
  if (!expected) {
    if (!_webhookLegacyWarned.has(envKey)) {
      _webhookLegacyWarned.add(envKey);
      console.warn(
        `[authz] ${envKey} is not set — webhook verification disabled (legacy mode). Set it and send X-Webhook-Secret to harden.`,
      );
    }
    return;
  }
  const provided = req.headers.get('x-webhook-secret');
  if (provided !== expected) {
    throw new AuthError('Forbidden', 403);
  }
}

/**
 * Wraps a Deno.serve handler to translate AuthErrors into correct HTTP responses
 * and any other thrown error into a 500. This removes boilerplate try/catch from
 * every function while keeping auth failures properly typed.
 *
 * Usage:
 *   Deno.serve(withAuth(async (req) => {
 *     const base44 = createClientFromRequest(req);
 *     const user = await requireUser(base44);   // throws 401 if unauthenticated
 *     assertOwned(record, user.id);             // throws 404 if not the owner
 *     ...
 *   }));
 */
export function withAuth(
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof AuthError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      console.error('Unhandled function error:', error);
      return Response.json(
        { error: (error as Error).message || 'Internal server error' },
        { status: 500 },
      );
    }
  };
}
