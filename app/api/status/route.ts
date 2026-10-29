import { getStatus } from '@/lib/server/engine';
import { handle, json } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export const GET = handle(() => json(getStatus()));
