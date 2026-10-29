import { ensureEngine } from '@/lib/server/engine';
import { handle, json } from '@/lib/server/http';
import { getAnalytics, parseRange } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

// GET /api/analytics?range=15m|1h|6h|24h
export const GET = handle((req: Request) => {
  ensureEngine();
  const range = parseRange(new URL(req.url).searchParams.get('range'), '1h');
  return json(getAnalytics(range));
});
