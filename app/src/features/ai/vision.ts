import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import type { Macros } from '@/features/food/types';

import { aiPost } from './client';

/** Capture une photo et renvoie son base64 (null si refusé/annulé). */
export async function captureImage(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
  if (res.canceled) return null;
  return res.assets[0]?.base64 ?? null;
}

export interface LabelResult {
  name: string;
  per_100g: Macros;
  per_portion?: Macros;
  serving_size?: string;
}

export interface PlateResult {
  items: { name: string; portion_guess: string }[];
  questions: string[];
}

export interface MachineResult {
  canonical_name: string;
  muscle_groups: string[];
  movement_pattern?: string;
  how_to?: string;
}

/** OCR d'étiquette nutritionnelle → valeurs structurées. */
export function useLabelVision() {
  return useMutation({ mutationFn: (imageBase64: string) => aiPost<LabelResult>('vision/label', { imageBase64 }) });
}

/** Photo d'assiette → items perçus + questions de confirmation. */
export function usePlateVision() {
  return useMutation({ mutationFn: (imageBase64: string) => aiPost<PlateResult>('vision/plate', { imageBase64 }) });
}

/** Scan d'affiche de machine → fiche équipement normalisée. */
export function useMachineVision() {
  return useMutation({
    mutationFn: (imageBase64: string) => aiPost<MachineResult>('vision/machine', { imageBase64 }),
  });
}
