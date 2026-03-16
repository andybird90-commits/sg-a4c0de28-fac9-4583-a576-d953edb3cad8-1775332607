const MENTION_REGEX = /@\[((?:[^\]]+))\]\([^)]+\)/g;

export function renderTextWithMentions(text: string | null | undefined): string {
  if (!text) {
    return "";
  }

  return text.replace(MENTION_REGEX, (_match: string, name: string) => `@${name}`);
}