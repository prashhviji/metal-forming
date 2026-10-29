import { ensureEngine, ingestReading } from '@/lib/server/engine';
import { fail, handle, json, readJson } from '@/lib/server/http';
import { getSeries, parseRange } from '@/lib/server/queries';
import { getSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

// GET /api/readings?range=5m|15m|1h|6h|24h  → peak-per-bucket time series
export const GET = handle((req: Request) => {
  ensureEngine();
  const range = parseRange(new URL(req.url).searchParams.get('range'), '15m');
  return json(getSeries(range));
});

/**
 * POST /api/readings — ingestion endpoint for the real sensor node (ESP32 / Arduino).
 * Body: { "vibration": 0.18, "temperature": 39.5, "current": 2.2 }
 * Response includes `mql.valve` ("on" | "off") so the node can drive the lubrication valve.
 * Only accepted when Settings → Data source is "Hardware".
 */
export const POST = handle(async (req: Request) => {
  ensureEngine();
  if (getSettings().engine.source !== 'hardware') {
    return fail('Server is using the built-in simulator. Switch the data source to "Hardware" in Settings first.', 409);
  }

  const body = await readJson(req);
  const read = (key: string, min: number, max: number) => {
    const v = body[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`"${key}" must be a number`);
    if (v < min || v > max) throw new Error(`"${key}" must be between ${min} and ${max}`);
    return v;
  };

  const result = ingestReading({
    vibration: read('vibration', 0, 100),
    temperature: read('temperature', -50, 500),
    current: read('current', 0, 1000),
  });
  return json({ ok: true, ...result });
});
