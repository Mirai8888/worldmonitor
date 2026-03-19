/**
 * Strip emoji characters from text. Used to sanitize external data
 * (news feeds, API responses) that may contain emojis.
 */
const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{1F680}-\u{1F6FF}\u{200D}\u{20E3}\u{FE0F}\u{E0020}-\u{E007F}\u{1F1E0}-\u{1F1FF}]/gu;

export function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
}
