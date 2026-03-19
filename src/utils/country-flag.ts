export function toFlagEmoji(code: string, fallback = ''): string {
  const upperCode = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upperCode)) return fallback;

  return upperCode;
}
