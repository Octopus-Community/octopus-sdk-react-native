import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  it('keeps both inactive ink and the active pill distinct on the segment track', () => {
    expect(
      contrast(chrome.textSecondary, chrome.segmentTrack)
    ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    expect(
      contrast(chrome.control, chrome.segmentTrack)
    ).toBeGreaterThanOrEqual(3);
  });
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

  it('keeps the off-track distinguishable from the card', () => {
    expect(contrast(chrome.track, chrome.surface)).toBeGreaterThanOrEqual(3);
  });
});

describe('OCTOPUS_SDK_THEME', () => {
  it('keeps each community palette on its matching background with readable links', () => {
    // Android picks its base palette from this luminance before applying host colors.
    expect(
      relativeLuminance(parseColor(OCTOPUS_SDK_THEME.light.background).rgb)
    ).toBeGreaterThan(0.5);
    expect(
      relativeLuminance(parseColor(OCTOPUS_SDK_THEME.dark.background).rgb)
    ).toBeLessThan(0.5);
    for (const colors of [OCTOPUS_SDK_THEME.light, OCTOPUS_SDK_THEME.dark]) {
      expect(
        contrast(colors.primary, colors.background)
      ).toBeGreaterThanOrEqual(TEXT_FLOOR);
      expect(contrast(colors.link, colors.background)).toBeGreaterThanOrEqual(
        TEXT_FLOOR
      );
    }
  });

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

describe('sample backgrounds', () => {
  it('paints flat sample backgrounds and readable headers in both themes', () => {
    for (const dark of [false, true]) {
      const chrome = chromeColors(dark);
      expect(chrome.header).toBe(chrome.background);
      expect(chrome.screen).toBe(chrome.background);
      expect(chrome.appBar).toBe(chrome.background);
      expect(contrast(chrome.onAppBar, chrome.header)).toBeGreaterThanOrEqual(
        TEXT_FLOOR
      );
      expect(chrome.navIndicator).toBe(chrome.accentContainer);
    }
    expect(
      readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
    ).not.toContain('<DarkHalo');
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
      surface: '#18253B',
      elevated: '#18253B',
      border: '#4A5F80',
      textBody: '#F2F5F9',
      text: '#F2F5F9',
      textSecondary: '#A3B0C2',
    });
    expect(OCTOPUS_BRAND.darkBorderStrong).toBe('#4A5F80');
  });

  it('hands the SDK the Android gray ramp mapping in dark only', () => {
    expect(OCTOPUS_SDK_THEME.dark).toMatchObject({
      gray100: '#070D17',
      gray200: '#18253B',
      gray300: '#2B364B',
      gray700: '#F2F5F9',
    });
    expect(Object.keys(OCTOPUS_SDK_THEME.light)).not.toEqual(
      expect.arrayContaining(['gray100'])
    );
  });
});

// All text roles, including placeholders and semantics, on each actual host surface.
describe.each(PALETTES)('%s R1 token floors', (_name, c) => {
  it.each([
    'background',
    'surface',
    'surfaceRaised',
    'elevated',
    'tint',
  ] as const)(
    'keeps text readable and control outlines distinct on %s',
    (surface) => {
      for (const ink of [
        c.text,
        c.textBody,
        c.textSecondary,
        c.textPlaceholder,
        c.accentText,
        c.success,
        c.danger,
      ]) {
        expect(contrast(ink, c[surface])).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(c.outline, c[surface])).toBeGreaterThanOrEqual(3);
      expect(contrast(c.focus, c[surface])).toBeGreaterThanOrEqual(3);
    }
  );
  it('keeps unread/update badges and warning/danger banners readable', () => {
    expect(contrast(c.onBadge, c.badgeFill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.warn, c.warnSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.danger, c.dangerSurface)).toBeGreaterThanOrEqual(4.5);
  });
});

// Launcher icon A3 "Pastille": the Octopus app symbol with its three dots on the navy
// tile, and the real React logo in the small bubble — the same composition as every other
// Octopus sample. `example/assets/launcher.svg` is the editable source; these checks keep
// the Android layers and the iOS icon from drifting back to the old glyph.
describe('launcher icon', () => {
  const exampleRoot = join(__dirname, '..', '..');
  const res = join(exampleRoot, 'android', 'app', 'src', 'main', 'res');
  const read = (...parts: string[]) => readFileSync(join(...parts), 'utf8');
  const svgPaths = (svg: string) =>
    [
      ...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"[^>]*fill="(#[0-9A-F]{6})"/gi),
    ].map((m) => `${m[2]!.toUpperCase()} ${m[1]}`);
  const vectorPaths = (xml: string) =>
    [
      ...xml.matchAll(
        /<path\b[^>]*android:fillColor="(#[0-9A-F]{6})"[^>]*android:pathData="([^"]+)"/gi
      ),
    ].map((m) => `${m[1]!.toUpperCase()} ${m[2]}`);

  it.each(['ic_launcher.xml', 'ic_launcher_round.xml'])(
    'declares the vector background, foreground and themed monochrome layers in %s',
    (file) => {
      const xml = read(res, 'mipmap-anydpi-v26', file);
      expect(xml).toContain('@drawable/ic_launcher_background');
      expect(xml).toContain('@drawable/ic_launcher_foreground');
      expect(xml).toContain(
        '<monochrome android:drawable="@drawable/ic_launcher_monochrome"'
      );
    }
  );

  it('draws the same symbol and React logo as the editable source', () => {
    const source = svgPaths(read(exampleRoot, 'assets', 'launcher.svg'));
    const foreground = vectorPaths(
      read(res, 'drawable', 'ic_launcher_foreground.xml')
    );
    expect(foreground).toHaveLength(3);
    expect(foreground).toEqual(source);
    // The official React blue that holds on the white bubble (#61DAFB is 1.6:1 there).
    expect(foreground[2]).toMatch(/^#087EA4 /);
  });

  it('cuts the React logo out of the themed symbol and keeps the dots solid', () => {
    const monochrome = vectorPaths(
      read(res, 'drawable', 'ic_launcher_monochrome.xml')
    );
    const [mark, dots, logo] = svgPaths(
      read(exampleRoot, 'assets', 'launcher.svg')
    ).map((p) => p.slice(8));
    // One even-odd path: the symbol plus the logo as a hole, so the system tint shows it.
    expect(monochrome.map((p) => p.slice(8))).toEqual([`${mark}${logo}`, dots]);
  });

  it('ships an opaque 1024 iOS app icon (App Store Connect rejects alpha)', () => {
    const png = readFileSync(
      join(
        exampleRoot,
        'ios',
        'OctopusReactNativeSdkExample',
        'Images.xcassets',
        'AppIcon.appiconset',
        'AppIcon.png'
      )
    );
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
    // IHDR colour type 2 = truecolour without alpha.
    expect(png[25]).toBe(2);
  });
});
