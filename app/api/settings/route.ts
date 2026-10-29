import { applySettings, ensureEngine } from '@/lib/server/engine';
import { handle, json, readJson } from '@/lib/server/http';
import { getMachine, getSettings, saveMachine } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

export const GET = handle(() => {
  ensureEngine();
  return json({ settings: getSettings(), machine: getMachine() });
});

// PUT /api/settings { thresholds?, mql?, engine?, machine? } — partial updates are merged and validated.
export const PUT = handle(async (req: Request) => {
  ensureEngine();
  const body = await readJson(req);
  const { machine, ...rest } = body as { machine?: Record<string, string> };
  const settings = applySettings(rest);
  const savedMachine = machine ? saveMachine(machine) : getMachine();
  return json({ settings, machine: savedMachine });
});
