import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The parser resolves colours through the native platform module, absent under Jest; the
// test is about geometry, so colours pass through unchanged.
jest.mock('react-native/Libraries/StyleSheet/processColor', () => ({
  __esModule: true,
  default: (color: unknown) => color,
}));

// Untyped Flow module: the renderer's own parser, which is what the halo test has to pin.
const processBackgroundImage: (value: string) => unknown[] = jest.requireActual(
  'react-native/Libraries/StyleSheet/processBackgroundImage'
).default;

import { darkHaloBackgroundImage } from '../components/DarkHalo';
import type { ChromeColors } from '../theme/branding';
import {
  chromeColors,
  OCTOPUS_BRAND,
  OCTOPUS_SDK_THEME,
} from '../theme/branding';

// The palette's contrast claims used to live only in its own comments, and three of them
// were wrong. This measures them instead: every fill/ink pair the sample actually paints,
// in both appearances, against the WCAG 2.x floors (4.5:1 for text, 3:1 for UI). It is
// also the guard against crossing a pair — drawing `onControl` on an `accent` fill gave
// the Config screen's "Start SDK" label 1.08:1, i.e. invisible, and no type caught it.

const TEXT_FLOOR = 4.5;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** A hex or `rgba()` value, split into its channels and its alpha. */
function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex !== null) {
    const digits = hex[1] ?? '';
    return {
      rgb: {
        r: parseInt(digits.slice(0, 2), 16),
        g: parseInt(digits.slice(2, 4), 16),
        b: parseInt(digits.slice(4, 6), 16),
      },
      alpha: 1,
    };
  }
  const rgba =
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
      value.trim()
    );
  if (rgba !== null) {
    return {
      rgb: {
        r: Number(rgba[1]),
        g: Number(rgba[2]),
        b: Number(rgba[3]),
      },
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  throw new Error(`Unsupported colour value: ${value}`);
}

/** Source-over compositing, rounded back to 8-bit — what the screen actually shows. */
function compositeOver(top: string, bottom: Rgb): Rgb {
  const { rgb, alpha } = parseColor(top);
  return {
    r: Math.round(alpha * rgb.r + (1 - alpha) * bottom.r),
    g: Math.round(alpha * rgb.g + (1 - alpha) * bottom.g),
    b: Math.round(alpha * rgb.b + (1 - alpha) * bottom.b),
  };
}

/** Layers bottom-up: `stack('#FFFFFF', 'rgba(15,27,45,0.15)')` is the tint on the card. */
function stack(...layers: string[]): Rgb {
  const [base, ...rest] = layers;
  if (base === undefined) throw new Error('stack() needs at least one layer');
  return rest.reduce<Rgb>(
    (bottom, layer) => compositeOver(layer, bottom),
    parseColor(base).rgb
  );
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * WCAG 2.x contrast of `foreground` over `background`, the latter given bottom-up so an
 * alpha layer (a tint, an indicator) is measured composited rather than as a raw value.
 */
function contrast(foreground: string, ...background: string[]): number {
  const backdrop = stack(...background);
  const ink = relativeLuminance(compositeOver(foreground, backdrop));
  const surface = relativeLuminance(backdrop);
  return (Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05);
}

/** The palette read by role name, so a name taken from source is still type-safe. */
function role(palette: ChromeColors, name: string): string {
  const value = (palette as unknown as Record<string, string | undefined>)[
    name
  ];
  if (value === undefined) {
    throw new Error(`branding.ts declares no chrome role \`${name}\``);
  }
  return value;
}

const PALETTES: [string, ChromeColors][] = [
  ['light', chromeColors(false)],
  ['dark', chromeColors(true)],
];

describe('the contrast helper itself', () => {
  it('reproduces the reference ratios', () => {
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 2);
    // The two values the design contract calls fill-only, as white ink: both fail.
    expect(contrast('#FFFFFF', '#1D88FE')).toBeCloseTo(3.5, 1);
    expect(contrast('#FFFFFF', OCTOPUS_SDK_THEME.dark.primary)).toBeLessThan(
      TEXT_FLOOR
    );
  });

  it('composites an alpha layer onto what is under it', () => {
    // Navy at 15% over white is the light nav indicator; measured raw it would read as
    // navy-on-navy.
    expect(contrast('#0F1B2D', '#FFFFFF', 'rgba(15,27,45,0.15)')).toBeCloseTo(
      12.7,
      1
    );
  });
});

describe.each(PALETTES)('%s chrome palette', (_name, chrome) => {
  it('keeps the CTA ink readable on its fill, pressed included', () => {
    expect(contrast(chrome.onAccent, chrome.accent)).toBeGreaterThanOrEqual(
      TEXT_FLOOR
    );
    expect(
      contrast(chrome.onAccent, chrome.accentPressed)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });

  it('keeps the control ink readable on the control fill', () => {
    expect(contrast(chrome.onControl, chrome.control)).toBeGreaterThanOrEqual(
      TEXT_FLOOR
    );
  });

  it('keeps the selected tab readable on the bar and over its indicator', () => {
    expect(
      contrast(chrome.navActive, chrome.navSurface)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    expect(
      contrast(chrome.navActive, chrome.navSurface, chrome.navIndicator)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });

  it('keeps a code block readable', () => {
    expect(
      contrast(chrome.onCodeSurface, chrome.codeSurface)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });

  it('keeps body text readable on both the card and the page', () => {
    expect(contrast(chrome.text, chrome.surface)).toBeGreaterThanOrEqual(
      TEXT_FLOOR
    );
    expect(contrast(chrome.text, chrome.background)).toBeGreaterThanOrEqual(
      TEXT_FLOOR
    );
  });

  it('keeps the snackbar message, dismiss glyph and action readable', () => {
    expect(contrast(chrome.onSnackbar, chrome.snackbar)).toBeGreaterThanOrEqual(
      TEXT_FLOOR
    );
    expect(
      contrast(chrome.snackbarAction, chrome.snackbar)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });

  it.each(['surface', 'elevated'] as const)(
    'keeps body and danger text readable on %s',
    (surface) => {
      expect(contrast(chrome.textBody, chrome[surface])).toBeGreaterThanOrEqual(
        TEXT_FLOOR
      );
      expect(contrast(chrome.danger, chrome[surface])).toBeGreaterThanOrEqual(
        TEXT_FLOOR
      );
    }
  );
});

describe('dark chrome affordances', () => {
  const chrome = chromeColors(true);

  it.each(['surface', 'surfaceRaised', 'elevated', 'appBar'] as const)(
    'keeps neutral badge ink readable on its fill composited over %s',
    (surface) => {
      const { badge, badgeText } = chrome;
      if (badge === undefined || badgeText === undefined) {
        throw new Error('The dark palette must define neutral badge styles');
      }
      const { r, g, b } = parseColor(badgeText.color).rgb;
      expect(
        contrast(
          `rgba(${r},${g},${b},${badgeText.opacity})`,
          chrome[surface],
          badge.backgroundColor
        )
      ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    }
  );

  it('keeps caption ink readable where the halo peaks over the page', () => {
    expect(
      contrast(chrome.textSecondary, chrome.background, OCTOPUS_BRAND.darkHalo)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });

  it('keeps the off-track distinguishable from the card', () => {
    expect(contrast(chrome.track, chrome.surface)).toBeGreaterThanOrEqual(3);
  });

  it('keeps both inactive ink and the active pill distinct on the segment track', () => {
    expect(
      contrast(chrome.textSecondary, chrome.segmentTrack)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    expect(contrast(chrome.accent, chrome.segmentTrack)).toBeGreaterThanOrEqual(
      3
    );
  });
});

describe('OCTOPUS_SDK_THEME', () => {
  it('keeps `onPrimary` readable on `primary` in both appearances', () => {
    expect(
      contrast(
        OCTOPUS_SDK_THEME.light.onPrimary,
        OCTOPUS_SDK_THEME.light.primary
      )
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    expect(
      contrast(OCTOPUS_SDK_THEME.dark.onPrimary, OCTOPUS_SDK_THEME.dark.primary)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });
});

// The pair above is only the palette's promise. This reads the one screen that broke it
// and measures the pair it actually paints, so swapping that ink back to the `onControl`
// prop fails here instead of shipping an invisible CTA.
describe("the Config screen's CTA", () => {
  const source = readFileSync(
    join(__dirname, '..', 'screens', 'ConfigScreen.tsx'),
    'utf8'
  );
  const fill = /backgroundColor: pressed \? chrome\.(\w+) : chrome\.(\w+)/.exec(
    source
  );
  const ink = /styles\.startButtonText,\s*\{ color: chrome\.(\w+) \}/.exec(
    source
  );

  it('draws its label in a chrome role, not in a prop', () => {
    expect(fill).not.toBeNull();
    expect(ink).not.toBeNull();
  });

  it.each(PALETTES)('is readable in the %s palette', (_name, chrome) => {
    const inkRole = ink?.[1];
    const pressedRole = fill?.[1];
    const restingRole = fill?.[2];
    if (
      inkRole === undefined ||
      pressedRole === undefined ||
      restingRole === undefined
    ) {
      throw new Error(
        'ConfigScreen no longer pairs the CTA fill and ink through `chrome` roles'
      );
    }
    expect(
      contrast(role(chrome, inkRole), role(chrome, restingRole))
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    expect(
      contrast(role(chrome, inkRole), role(chrome, pressedRole))
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });
});

describe('dark halo (shared cross-platform spec)', () => {
  it('glows from the top-right corner, radius = window width, accent 12 % to 0', () => {
    expect(darkHaloBackgroundImage(411.4)).toBe(
      'radial-gradient(ellipse 411px 411px at 100% 0%, rgba(29,136,254,0.12), rgba(29,136,254,0))'
    );
    expect(OCTOPUS_BRAND.darkHalo).toBe('rgba(29,136,254,0.12)');
    expect(OCTOPUS_BRAND.darkHaloEnd).toBe('rgba(29,136,254,0)');
  });

  it("survives React Native's own gradient parser with the corner and radius intact", () => {
    // The string is only half the contract: RN 0.81 mis-parses `circle <r> at …` into a
    // centred gradient without any warning, so check what the renderer actually receives.
    const [parsed] = processBackgroundImage(darkHaloBackgroundImage(411.4));
    expect(parsed).toMatchObject({
      type: 'radial-gradient',
      size: { x: 411, y: 411 },
      position: { top: '0%', left: '100%' },
    });
  });

  it('lets the halo through the dark header and screens, and only there', () => {
    const dark = chromeColors(true);
    const light = chromeColors(false);
    expect(dark.header).toBe('transparent');
    expect(dark.screen).toBe('transparent');
    // System bars keep their behaviour: the inset colour is unchanged in both themes.
    expect(dark.appBar).toBe(OCTOPUS_BRAND.darkBackground);
    expect(light.appBar).toBe(OCTOPUS_BRAND.navy);
    // Light theme unchanged: the header is the navy bar, the screen the page colour.
    expect(light.header).toBe(light.appBar);
    expect(light.screen).toBe(light.background);
  });
});

describe('dark palette (shared cross-platform spec)', () => {
  const chrome = chromeColors(true);

  it('pins the dark ladder values', () => {
    expect({
      background: chrome.background,
      surface: chrome.surface,
      elevated: chrome.elevated,
      border: chrome.border,
      textBody: chrome.textBody,
      text: chrome.text,
      textSecondary: chrome.textSecondary,
    }).toEqual({
      background: '#070D17',
      surface: '#0F1B2D',
      elevated: '#16243A',
      border: '#1E2A3D',
      textBody: '#E9F0FA',
      text: '#F2F6FC',
      textSecondary: '#8C9AB0',
    });
    expect(OCTOPUS_BRAND.darkBorderStrong).toBe('#243349');
  });

  it('hands the SDK the Android gray ramp mapping in dark only', () => {
    expect(OCTOPUS_SDK_THEME.dark).toMatchObject({
      gray100: '#070D17',
      gray200: '#0F1B2D',
      gray300: '#1E2A3D',
      gray700: '#E9F0FA',
    });
    expect(Object.keys(OCTOPUS_SDK_THEME.light)).not.toEqual(
      expect.arrayContaining(['gray100'])
    );
  });
});
