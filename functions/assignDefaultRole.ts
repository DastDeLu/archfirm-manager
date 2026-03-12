import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const OWNER_EMAIL = 'dastdelu@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const userId = payload?.event?.entity_id || payload?.data?.id;
    const userEmail = payload?.data?.email;

    if (!userId) {
      return Response.json({ error: 'Missing user id' }, { status: 400 });
    }

    const role = userEmail === OWNER_EMAIL ? 'Sviluppatore' : 'Cliente';

    await base44.asServiceRole.entities.User.update(userId, { role });

    return Response.json({ success: true, role });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});