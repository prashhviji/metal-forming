import { handle, json } from '@/lib/server/http';
import { readMlResults } from '@/lib/server/ml';

export const dynamic = 'force-dynamic';

// GET /api/ml — latest results from `ml/train.py`, or { available: false } if it has not been run yet.
export const GET = handle(async () => json(readMlResults()));
