/**
 * Optionally injects owner_user_id into entity create payloads.
 *
 * Default (env unset or not "true"): returns data unchanged so existing Base44 apps
 * without an owner_user_id field on entities keep working and legacy data stays valid.
 *
 * When you add the field to the schema and configure RLS, set in .env:
 *   VITE_STAMP_OWNER_ON_CREATE=true
 *
 * Server-side creates use the same opt-in via STAMP_OWNER_USER_ID=true (Deno secrets).
 *
 * @param {object} data
 * @param {string|null} userId from useCurrentUserId()
 * @returns {object}
 */
export function withOwner(data, userId) {
  if (import.meta.env.VITE_STAMP_OWNER_ON_CREATE !== 'true') {
    return data;
  }
  if (!userId) return data;
  return { ...data, owner_user_id: userId };
}
