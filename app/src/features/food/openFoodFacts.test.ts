import { describe, expect, it, jest } from '@jest/globals';

import { lookupBarcode, mapOffProduct, OFF_USER_AGENT } from './openFoodFacts';

describe('mapOffProduct', () => {
  it('mappe un produit complet vers un Food', () => {
    const res = mapOffProduct('3017620422003', {
      status: 1,
      product: {
        product_name: 'Nutella',
        brands: 'Ferrero, Nutella',
        serving_size: '15 g',
        nutriments: {
          'energy-kcal_100g': 539,
          proteins_100g: 6.3,
          carbohydrates_100g: 57.5,
          fat_100g: 30.9,
        },
      },
    });
    expect(res.status).toBe('found');
    if (res.status !== 'found') return;
    expect(res.food.name).toBe('Nutella');
    expect(res.food.brand).toBe('Ferrero'); // 1re marque
    expect(res.food.kcal_100g).toBe(539);
    expect(res.food.barcode).toBe('3017620422003');
    expect(res.food.source).toBe('off');
  });

  it('convertit l’énergie en kJ quand les kcal directes manquent', () => {
    const res = mapOffProduct('123', {
      status: 1,
      product: { product_name: 'X', nutriments: { energy_100g: 2255, proteins_100g: 5 } },
    });
    expect(res.status).toBe('found');
    if (res.status !== 'found') return;
    expect(res.food.kcal_100g).toBe(Math.round(2255 / 4.184)); // ≈ 539
  });

  it('status 0 → produit inconnu', () => {
    expect(mapOffProduct('000', { status: 0 }).status).toBe('not_found');
  });

  it('produit connu mais sans nutriments → incomplete', () => {
    const res = mapOffProduct('456', { status: 1, product: { product_name: 'Truc', nutriments: {} } });
    expect(res.status).toBe('incomplete');
    if (res.status === 'incomplete') expect(res.name).toBe('Truc');
  });
});

describe('lookupBarcode', () => {
  const okJson = (body: unknown) =>
    ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

  it('envoie le User-Agent custom et mappe la réponse', async () => {
    const fetchMock = jest.fn(async () =>
      okJson({ status: 1, product: { product_name: 'Y', nutriments: { 'energy-kcal_100g': 100 } } })
    ) as unknown as typeof fetch;

    const res = await lookupBarcode('789', fetchMock);
    expect(res.status).toBe('found');
    const call = (fetchMock as unknown as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((call[1].headers as Record<string, string>)['User-Agent']).toBe(OFF_USER_AGENT);
  });

  it('404 → produit inconnu', async () => {
    const fetchMock = (async () => ({ ok: false, status: 404 }) as Response) as typeof fetch;
    expect((await lookupBarcode('404', fetchMock)).status).toBe('not_found');
  });

  it('erreur réseau → status error', async () => {
    const fetchMock = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    const res = await lookupBarcode('x', fetchMock);
    expect(res.status).toBe('error');
  });
});
