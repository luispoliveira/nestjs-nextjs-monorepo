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
];

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
            currentObj[key] = '[SANITIZED]';
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
}
