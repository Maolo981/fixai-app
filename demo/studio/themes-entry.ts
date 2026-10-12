// Theme artwork for Confetto Studio: the same code as the product draws each style's CSS in the browser,
// so the page ships the drawing code once instead of the CSS of every style.
import { ornaments, themeInlineCss } from '../../src/themes';

(globalThis as unknown as { ConfettoThemes: unknown }).ConfettoThemes = { ornaments, themeInlineCss };
