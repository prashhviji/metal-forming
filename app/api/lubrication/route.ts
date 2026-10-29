import { ensureEngine, getMqlState, sprayNow, stopSprayNow } from '@/lib/server/engine';
import { fail, handle, json, readJson } from '@/lib/server/http';
import { getLubrication } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

export const GET = handle(() => {
  ensureEngine();
  return json(getLubrication());
});

// POST /api/lubrication { action: "spray_now" | "stop" }
// (Enable/disable and tuning go through PUT /api/settings.)
export const POST = handle(async (req: Request) => {
  ensureEngine();
  const body = await readJson(req);
  if (body.action === 'spray_now') return json({ ok: true, mql: sprayNow() });
  if (body.action === 'stop') return json({ ok: true, mql: stopSprayNow() });
  if (body.action === 'state') return json({ ok: true, mql: getMqlState() });
  return fail('Unknown action');
});
