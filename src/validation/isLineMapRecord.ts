export type LineMapValue = {
  content: string;
  fragment: string;
};
export type LineMapRecord = Record<string, LineMapValue>;

export const isLineMapRecord = (obj: any): obj is LineMapRecord => {
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

    if (
      typeof value !== 'object' ||
      value === null ||
      'content' in value === false ||
      'fragment' in value === false
    ) {
      return false;
    } else {
      if (typeof value.content !== 'string') {
        return false;
      } else if (typeof value.fragment !== 'string') {
        return false;
      }
    }
  }

  return true;
};
