import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Figma-derived typography tokens (src/app/globals.css) share the "text-" prefix
// with Tailwind's color utilities, so tailwind-merge's default config can't tell
// them apart and drops the font-size class whenever a text-{color} class follows it.
// Registering them under "font-size" keeps size and color merging independent.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "title-bold-28",
            "title-bold-24",
            "title-bold-20",
            "title-semibold-20",
            "title-semibold-18",
            "title-semibold-16",
            "body-semibold-15",
            "body-semibold-14",
            "body-medium-16",
            "body-medium-15",
            "body-medium-14",
            "body-medium-13",
            "body-medium-12",
            "body-regular-16",
            "body-regular-15",
            "body-regular-14",
            "body-regular-13",
            "body-regular-12",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
