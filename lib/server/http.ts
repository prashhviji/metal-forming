import { NextResponse } from 'next/server';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

/** Wrap a handler so thrown errors become JSON responses instead of HTML 500 pages. */
export function handle<A extends unknown[]>(fn: (...args: A) => Response | Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      // Validation errors from settings are user mistakes, not crashes.
      const isValidation = err instanceof Error && /must be|cannot be|between/.test(message);
      if (!isValidation) console.error('[api]', err);
      return fail(message, isValidation ? 400 : 500);
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new Error('Request body must be a JSON object');
}
