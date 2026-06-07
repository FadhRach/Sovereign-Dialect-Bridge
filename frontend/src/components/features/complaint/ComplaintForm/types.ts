/**
 * Shared types & constants untuk ComplaintForm wizard.
 */

export interface FormState {
  original_text: string;
  wilayah: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
}

export const MAX_CHARS = 5000;
export const MIN_CHARS = 20;
export const MAX_PHOTO_MB = 5;
