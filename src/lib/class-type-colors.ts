export interface PaletteEntry {
  label: string;
  color: string;
  swatch: string;
}

export const CLASS_TYPE_PALETTE = {
  blue: {
    label: "Blue",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    swatch: "bg-blue-300",
  },
  sky: {
    label: "Sky",
    color: "bg-sky-100 text-sky-800 border-sky-300",
    swatch: "bg-sky-300",
  },
  purple: {
    label: "Purple",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    swatch: "bg-purple-300",
  },
  violet: {
    label: "Violet",
    color: "bg-violet-100 text-violet-800 border-violet-300",
    swatch: "bg-violet-300",
  },
  emerald: {
    label: "Emerald",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    swatch: "bg-emerald-300",
  },
  orange: {
    label: "Orange",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    swatch: "bg-orange-300",
  },
  red: {
    label: "Red",
    color: "bg-red-100 text-red-800 border-red-300",
    swatch: "bg-red-300",
  },
  amber: {
    label: "Amber",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    swatch: "bg-amber-300",
  },
  lime: {
    label: "Lime",
    color: "bg-lime-100 text-lime-800 border-lime-300",
    swatch: "bg-lime-300",
  },
  rose: {
    label: "Rose",
    color: "bg-rose-100 text-rose-800 border-rose-300",
    swatch: "bg-rose-300",
  },
  pink: {
    label: "Pink",
    color: "bg-pink-100 text-pink-800 border-pink-300",
    swatch: "bg-pink-300",
  },
  fuchsia: {
    label: "Fuchsia",
    color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
    swatch: "bg-fuchsia-300",
  },
  teal: {
    label: "Teal",
    color: "bg-teal-100 text-teal-800 border-teal-300",
    swatch: "bg-teal-300",
  },
  cyan: {
    label: "Cyan",
    color: "bg-cyan-100 text-cyan-800 border-cyan-300",
    swatch: "bg-cyan-300",
  },
  indigo: {
    label: "Indigo",
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    swatch: "bg-indigo-300",
  },
  yellow: {
    label: "Yellow",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    swatch: "bg-yellow-300",
  },
  green: {
    label: "Green",
    color: "bg-green-100 text-green-800 border-green-300",
    swatch: "bg-green-300",
  },
  gray: {
    label: "Gray",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    swatch: "bg-gray-300",
  },
} as const satisfies Record<string, PaletteEntry>;

export type ClassTypeColorKey = keyof typeof CLASS_TYPE_PALETTE;

export const DEFAULT_COLOR_KEY: ClassTypeColorKey = "gray";

export function getPaletteEntry(colorKey: string | undefined | null): PaletteEntry {
  if (colorKey && colorKey in CLASS_TYPE_PALETTE) {
    return CLASS_TYPE_PALETTE[colorKey as ClassTypeColorKey];
  }
  return CLASS_TYPE_PALETTE[DEFAULT_COLOR_KEY];
}
