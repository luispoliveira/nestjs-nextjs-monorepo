const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'accesstoken',
  'refreshtoken',
  'cardnumber',
  'cvv',
  'ssn',
  'secret',
  'access_token',
  'x-api-key',
  // Protected PII (pii-field-encryption spec) — append new PII keys here and
  // in pino's redact.paths.
  'taxid',
];

// Query parameters whose values never reach the logs: search terms can carry
// PII (a NIF search sends it in plaintext; names and emails too).
const SENSITIVE_QUERY_PARAMS = ['search'];
const REDACTED = '[SANITIZED]';

export class SanitizeUtil {
  static sanitize<T extends object>(obj: T): T {
    if (!obj) {
      return obj;
    }

    const sanitizedObj = structuredClone(obj);

    const recursiveSanitize = (currentObj: Record<string, unknown>) => {
      if (currentObj === null || typeof currentObj !== 'object') {
        return;
      }

      for (const key in currentObj) {
        if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
          if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            currentObj[key] = REDACTED;
          } else if (
            typeof currentObj[key] === 'object' &&
            currentObj[key] !== null
          ) {
            recursiveSanitize(currentObj[key] as Record<string, unknown>);
          }
        }
      }
    };

    recursiveSanitize(sanitizedObj as Record<string, unknown>);
    return sanitizedObj;
  }

  /** Redacts the values of `SENSITIVE_QUERY_PARAMS` in a request URL for logging. */
  static sanitizeUrl(url: string): string {
    const queryStart = url.indexOf('?');
    if (queryStart === -1) return url;

    const query = url
      .slice(queryStart + 1)
      .split('&')
      .map((pair) => {
        const key = pair.split('=')[0] ?? '';
        return SENSITIVE_QUERY_PARAMS.includes(key.toLowerCase())
          ? `${key}=${REDACTED}`
          : pair;
      })
      .join('&');
    return `${url.slice(0, queryStart)}?${query}`;
  }
}
