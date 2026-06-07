/**
 * Helper kecil untuk gabung Tailwind class secara bersih.
 * Kombinasi clsx (conditional class) + tailwind-merge (resolve konflik).
 *
 * Pakai:
 *   <div className={cn("p-4", condition && "bg-red-50")} />
 *   <Button className={cn("text-lg", props.className)} />
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
