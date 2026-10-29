// Runs once when the Next.js server starts. Boots the sensor engine so readings
// keep accumulating in the local database even when no browser tab is open.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startEngine } = await import('./lib/server/engine');
    startEngine();
  }
}
