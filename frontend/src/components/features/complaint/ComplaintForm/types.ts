/**
 * Shared types & constants untuk ComplaintForm wizard.
 */

export interface FormState {
  original_text: string;
  wilayah: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  photo_preview: string | null;
  photo_uploading: boolean;
}

export const MAX_CHARS = 5000;
export const MIN_CHARS = 50;
export const MIN_WORDS = 10;
export const MAX_PHOTO_MB = 5;

export function countWords(text: string): number {
  return text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}
