/**
 * Server-side input sanitization utilities.
 * Escapes HTML entities to prevent stored XSS.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const HTML_ESCAPE_REGEX = /[&<>"'/]/g;

/** Escape HTML-significant characters. */
export function escapeHtml(input: string): string {
  return input.replace(
    HTML_ESCAPE_REGEX,
    (char) => HTML_ESCAPE_MAP[char] || char
  );
}

/** Trim whitespace and escape HTML entities. */
export function sanitizeInput(input: string): string {
  return escapeHtml(input.trim());
}

/** Shallow-sanitize all string values in an object. */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T
): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeInput(
        result[key] as string
      );
    }
  }
  return result;
}
