/**
 * Parse JSON without throwing. Returns `fallback` on any failure. Also tolerates
 * models that wrap JSON in ```json fences or surround it with prose by
 * extracting the first balanced `{...}` block.
 */
export function safeJsonParse<T>(input: string, fallback: T): T {
  if (typeof input !== "string") return fallback;

  const direct = tryParse<T>(input);
  if (direct.ok) return direct.value;

  const extracted = extractJsonObject(input);
  if (extracted !== null) {
    const parsed = tryParse<T>(extracted);
    if (parsed.ok) return parsed.value;
  }

  return fallback;
}

function tryParse<T>(
  text: string,
): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false };
  }
}

/** Returns the first balanced top-level `{...}` substring, or null. */
function extractJsonObject(input: string): string | null {
  const start = input.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }

  return null;
}
