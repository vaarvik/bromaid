const ESCAPES: Readonly<Record<string, string>> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ESCAPES[c] ?? c);
}
