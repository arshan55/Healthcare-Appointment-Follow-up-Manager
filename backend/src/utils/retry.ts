export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseMs = options.baseMs ?? 2000;
  let lastError: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts) break;
      await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, i - 1)));
    }
  }

  throw lastError;
}
