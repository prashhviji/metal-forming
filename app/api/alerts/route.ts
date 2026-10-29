import { ensureEngine } from '@/lib/server/engine';
import { fail, handle, json, readJson } from '@/lib/server/http';
import { acknowledgeAlert, acknowledgeAllAlerts, getAlerts } from '@/lib/server/queries';
import type { AlertStatus, AlertType } from '@/types/monitor';

export const dynamic = 'force-dynamic';

const STATUSES = ['active', 'acknowledged', 'resolved', 'open'];
const TYPES = ['vibration', 'temperature', 'current', 'lubrication'];

// GET /api/alerts?status=open|active|acknowledged|resolved&type=...&limit=&offset=
export const GET = handle((req: Request) => {
  ensureEngine();
  const p = new URL(req.url).searchParams;
  const status = p.get('status');
  const type = p.get('type');
  return json(
    getAlerts({
      status: status && STATUSES.includes(status) ? (status as AlertStatus | 'open') : undefined,
      type: type && TYPES.includes(type) ? (type as AlertType) : undefined,
      limit: Number(p.get('limit')) || 100,
      offset: Number(p.get('offset')) || 0,
    })
  );
});

// POST /api/alerts { action: "acknowledge", id } | { action: "acknowledge_all" }
export const POST = handle(async (req: Request) => {
  const body = await readJson(req);
  if (body.action === 'acknowledge_all') return json({ ok: true, changed: acknowledgeAllAlerts() });
  if (body.action === 'acknowledge') {
    if (typeof body.id !== 'number') return fail('"id" must be a number');
    return json({ ok: true, changed: acknowledgeAlert(body.id) ? 1 : 0 });
  }
  return fail('Unknown action');
});
