import { ensureEngine, injectFault, resetData } from '@/lib/server/engine';
import { fail, handle, json, readJson } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

// POST /api/system { action: "inject_fault" | "reset_data", reseed?: boolean, hours?: 1–72 }
export const POST = handle(async (req: Request) => {
  ensureEngine();
  const body = await readJson(req);

  if (body.action === 'inject_fault') {
    return injectFault()
      ? json({ ok: true })
      : fail('Fault injection only works with the built-in simulator.', 409);
  }

  if (body.action === 'reset_data') {
    const hours = typeof body.hours === 'number' && Number.isFinite(body.hours) ? body.hours : undefined;
    resetData({ reseed: body.reseed === true, hours });
    return json({ ok: true });
  }

  return fail('Unknown action');
});
