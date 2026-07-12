/**
 * Parseur markdown pur (sans dépendance, sans React) pour le rendu du chat coach.
 * Sous-ensemble supporté : titres (#/##/###), listes (à puces et numérotées),
 * paragraphes, et inline code (backticks), gras (doubles astérisques),
 * italique (astérisque simple ou underscore).
 * Robuste par construction : jamais d'exception sur markdown mal formé (un
 * marqueur ouvrant sans fermant retombe en texte littéral).
 */

export type Span = { t: 'text' | 'bold' | 'italic' | 'code'; s: string };
export type MdBlock =
  | { type: 'p'; spans: Span[] }
  | { type: 'h'; level: 1 | 2 | 3; spans: Span[] }
  | { type: 'ul'; items: Span[][] }
  | { type: 'ol'; items: Span[][] };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const BULLET_RE = /^[-*]\s+(.*)$/;
const NUMBERED_RE = /^\d+\.\s+(.*)$/;

/** Découpe une ligne de texte en spans typés (code/gras/italique/texte). */
export function parseInline(s: string): Span[] {
  const spans: Span[] = [];
  let textBuf = '';
  let i = 0;

  const flushText = () => {
    if (textBuf.length > 0) {
      spans.push({ t: 'text', s: textBuf });
      textBuf = '';
    }
  };

  while (i < s.length) {
    const matched =
      tryMatch(s, i, '`', '`', 'code') ??
      tryMatch(s, i, '**', '**', 'bold') ??
      tryMatch(s, i, '*', '*', 'italic') ??
      tryMatch(s, i, '_', '_', 'italic');

    if (matched) {
      flushText();
      spans.push({ t: matched.t, s: matched.content });
      i = matched.next;
    } else {
      textBuf += s[i];
      i += 1;
    }
  }
  flushText();
  return spans;
}

type InlineMatch = { t: Span['t']; content: string; next: number };

/** Tente de matcher un motif `open...close` fermé à partir de la position i. Retourne null si absent. */
function tryMatch(
  s: string,
  i: number,
  open: string,
  close: string,
  t: Span['t']
): InlineMatch | null {
  if (!s.startsWith(open, i)) return null;
  const closeIdx = s.indexOf(close, i + open.length);
  if (closeIdx === -1) return null;
  const content = s.slice(i + open.length, closeIdx);
  if (content.length === 0) return null;
  return { t, content, next: closeIdx + close.length };
}

type PendingBlock =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

/** Transforme le texte markdown du coach en une liste de blocs typés. */
export function parseMarkdown(text: string): MdBlock[] {
  if (typeof text !== 'string' || text.trim().length === 0) return [];

  const blocks: MdBlock[] = [];
  let pending: PendingBlock | null = null;

  const flush = () => {
    if (!pending) return;
    if (pending.kind === 'p') {
      blocks.push({ type: 'p', spans: parseInline(pending.lines.join(' ')) });
    } else if (pending.kind === 'ul') {
      blocks.push({ type: 'ul', items: pending.items.map(parseInline) });
    } else {
      blocks.push({ type: 'ol', items: pending.items.map(parseInline) });
    }
    pending = null;
  };

  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim().length === 0) {
      flush();
      continue;
    }

    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      flush();
      const level = (headingMatch[1]?.length ?? 1) as 1 | 2 | 3;
      blocks.push({ type: 'h', level, spans: parseInline(headingMatch[2] ?? '') });
      continue;
    }

    const bulletMatch = BULLET_RE.exec(line);
    if (bulletMatch) {
      if (!pending || pending.kind !== 'ul') {
        flush();
        pending = { kind: 'ul', items: [] };
      }
      pending.items.push(bulletMatch[1] ?? '');
      continue;
    }

    const numberedMatch = NUMBERED_RE.exec(line);
    if (numberedMatch) {
      if (!pending || pending.kind !== 'ol') {
        flush();
        pending = { kind: 'ol', items: [] };
      }
      pending.items.push(numberedMatch[1] ?? '');
      continue;
    }

    if (pending && pending.kind === 'p') {
      pending.lines.push(line);
    } else {
      flush();
      pending = { kind: 'p', lines: [line] };
    }
  }
  flush();

  return blocks;
}
