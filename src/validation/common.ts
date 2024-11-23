export function isStringRecord(obj: unknown): obj is Record<string, string> {
  if (typeof obj !== 'object') {
    return false;
  }

  if (Array.isArray(obj)) {
    return false;
  }

  if (Object.getOwnPropertySymbols(obj).length > 0) {
    return false;
  }

  if (obj === null) {
    return false;
  }

  const entries = Object.entries(obj);

  for (const [key, value] of entries) {
    if (typeof key !== 'string') {
      return false;
    }

    if (typeof value !== 'string') {
      return false;
    }
  }

  return true;
}
