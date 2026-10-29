import { fail, handle } from '@/lib/server/http';
import { readMlFigure } from '@/lib/server/ml';

export const dynamic = 'force-dynamic';

// GET /api/ml/plot/<name> — one of the PNG figures written by `ml/train.py` (fixed whitelist of names).
export const GET = handle(async (_req: Request, { params }: { params: { name: string } }) => {
  const png = readMlFigure(params.name);
  if (!png) return fail('Figure not found — run ml/train.py first.', 404);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
});
