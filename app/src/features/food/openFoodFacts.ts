import { z } from 'zod';

import { newId } from '@/lib/id';

import type { Food } from './types';

/**
 * Client OpenFoodFacts (lecture seule, pas de clé API).
 * ⚠️ User-Agent custom OBLIGATOIRE (nom + version + contact) — règle OFF.
 * ⚠️ Données crowdsourcées : toujours vérifier la présence d'un champ.
 * ⚠️ Licence ODbL → attribution requise dans l'écran « À propos » (M11).
 */

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2';
const FIELDS = 'product_name,brands,nutriments,serving_size,image_url';
// TODO(humain) : renseigner un contact réel (email/url) — voir PROGRESS « À FAIRE ».
export const OFF_USER_AGENT = 'mangetout/0.1 (Android; contact: set-me@example.com)';

/** Schéma lâche : tout est optionnel (données communautaires incomplètes). */
const offProduct = z
  .object({
    product_name: z.string().optional(),
    brands: z.string().optional(),
    serving_size: z.string().optional(),
    nutriments: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const offResponse = z
  .object({
    status: z.number().optional(),
    product: offProduct.optional(),
  })
  .passthrough();

export type OffLookup =
  | { status: 'found'; food: Food }
  | { status: 'incomplete'; name: string; barcode: string } // produit connu mais macros absentes
  | { status: 'not_found' }
  | { status: 'error'; message: string };

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number.parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** kcal/100g : champ direct, sinon conversion depuis l'énergie en kJ. */
function kcal100(nutriments: Record<string, unknown>): number | undefined {
  const direct = num(nutriments['energy-kcal_100g']);
  if (direct !== undefined) return direct;
  const kj = num(nutriments['energy_100g']) ?? num(nutriments['energy-kj_100g']);
  return kj !== undefined ? Math.round(kj / 4.184) : undefined;
}

/** Transforme un produit OFF en Food canonique (pur, testable). */
export function mapOffProduct(barcode: string, raw: unknown): OffLookup {
  const parsed = offResponse.safeParse(raw);
  if (!parsed.success) return { status: 'error', message: 'Réponse OFF illisible' };

  const { status, product } = parsed.data;
  if (status === 0 || !product) return { status: 'not_found' };

  const name = (product.product_name ?? '').trim();
  const nutriments = product.nutriments ?? {};
  const kcal = kcal100(nutriments);
  const protein = num(nutriments['proteins_100g']);
  const carbs = num(nutriments['carbohydrates_100g']);
  const fat = num(nutriments['fat_100g']);

  // Produit connu mais sans données nutritionnelles exploitables.
  if (kcal === undefined && protein === undefined && carbs === undefined && fat === undefined) {
    return { status: 'incomplete', name: name || 'Produit sans valeurs nutritionnelles', barcode };
  }

  const food: Food = {
    id: newId(),
    name: name || `Produit ${barcode}`,
    brand: product.brands?.split(',')[0]?.trim() || undefined,
    barcode,
    source: 'off',
    kcal_100g: kcal ?? 0,
    protein_100g: protein ?? 0,
    carbs_100g: carbs ?? 0,
    fat_100g: fat ?? 0,
    servingSize: product.serving_size || undefined,
  };
  return { status: 'found', food };
}

/** Recherche un code-barres sur OFF. `fetchImpl` injectable pour les tests. */
export async function lookupBarcode(
  barcode: string,
  fetchImpl: typeof fetch = fetch
): Promise<OffLookup> {
  const url = `${OFF_BASE}/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': OFF_USER_AGENT } });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    return mapOffProduct(barcode, await res.json());
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'réseau' };
  }
}
