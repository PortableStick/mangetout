import { it, expect } from '@jest/globals';
import { parseMarkdown } from './markdown';

it('gras et italique inline', () => {
  expect(parseMarkdown('a **b** c')).toEqual([
    { type: 'p', spans: [{ t: 'text', s: 'a ' }, { t: 'bold', s: 'b' }, { t: 'text', s: ' c' }] },
  ]);
  expect(parseMarkdown('_i_')).toEqual([{ type: 'p', spans: [{ t: 'italic', s: 'i' }] }]);
});
it('code inline', () => {
  expect(parseMarkdown('`x`')).toEqual([{ type: 'p', spans: [{ t: 'code', s: 'x' }] }]);
});
it('titres', () => {
  expect(parseMarkdown('## Titre')).toEqual([{ type: 'h', level: 2, spans: [{ t: 'text', s: 'Titre' }] }]);
});
it('liste à puces et numérotée', () => {
  expect(parseMarkdown('- a\n- b')).toEqual([{ type: 'ul', items: [[{ t: 'text', s: 'a' }], [{ t: 'text', s: 'b' }]] }]);
  expect(parseMarkdown('1. a\n2. b')).toEqual([{ type: 'ol', items: [[{ t: 'text', s: 'a' }], [{ t: 'text', s: 'b' }]] }]);
});
it('marqueur non fermé → texte brut, jamais d’exception', () => {
  expect(parseMarkdown('a **b')).toEqual([{ type: 'p', spans: [{ t: 'text', s: 'a **b' }] }]);
});
it('chaîne vide → []', () => {
  expect(parseMarkdown('')).toEqual([]);
  expect(parseMarkdown('   ')).toEqual([]);
});
it('paragraphe multi-lignes joint + bloc séparé après ligne vide', () => {
  expect(parseMarkdown('a\nb\n\nc')).toEqual([
    { type: 'p', spans: [{ t: 'text', s: 'a b' }] },
    { type: 'p', spans: [{ t: 'text', s: 'c' }] },
  ]);
});
