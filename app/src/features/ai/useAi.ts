import { useMutation } from '@tanstack/react-query';

import type { Macros } from '@/features/food/types';

import { aiPost } from './client';

export interface ParsedFoodItem {
  name: string;
  quantity_g: number;
  macros: Macros;
}

/** Log alimentaire en langage naturel → items structurés (macros estimées). */
export function useParseFood() {
  return useMutation({
    mutationFn: (text: string) => aiPost<{ items: ParsedFoodItem[] }>('parse-food', { text }),
  });
}
