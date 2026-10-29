import { ensureEngine } from '@/lib/server/engine';
import { fail, handle } from '@/lib/server/http';
import { exportCsv, parseRange } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

const KINDS = ['readings', 'alerts', 'lubrication'] as const;

// GET /api/export?kind=readings|alerts|lubrication&range=5m|15m|1h|6h|24h|all
export const GET = handle((req: Request) => {
  ensureEngine();
  const p = new URL(req.url).searchParams;
  const kind = p.get('kind') as (typeof KINDS)[number] | null;
  if (!kind || !KINDS.includes(kind)) return fail('kind must be readings, alerts or lubrication');

  const rangeParam = p.get('range');
  const range = rangeParam === 'all' ? 'all' : parseRange(rangeParam, '1h');
  const csv = exportCsv(kind, range);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cnc-${kind}-${range}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
