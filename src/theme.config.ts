/**
 * Omarchy palette settings. Palettes are generated into src/palettes.ts and
 * src/styles/palettes.css by `npm run sync-palettes`.
 */
export const themeConfig = {
	/** Palette shown to visitors who haven't picked one. Any id from src/palettes.ts. */
	defaultPalette: "catppuccin-latte",
	/** Show the palette picker in the top bar (choice is remembered in a cookie). */
	paletteSwitcher: true,
} as const;

/** Cookie that stores the visitor's palette choice. */
export const PALETTE_COOKIE = "omarchy-palette";
