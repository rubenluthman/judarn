#!/usr/bin/env node

/**
 * Judarn Color Dictionary – Model Context Protocol (MCP) Server
 * Zero-dependency stdio JSON-RPC 2.0 server for Claude Desktop, Cursor, Antigravity, and AI coding assistants.
 * Provides access to all 348 Sanzo Wada historical color combinations and 159 colors calibrated in OKLCh.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { oklchToHex } = require('../../../scripts/lib/design-tokens.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/wada-catalog.json'), 'utf8'));
const colors = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/wada-colors.json'), 'utf8'));

// Mathematical OKLCh conversion
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function srgbToOklch(r, g, b) {
  const invGamma = (v) => {
    v = v / 255.0;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rL = invGamma(r);
  const gL = invGamma(g);
  const bL = invGamma(b);

  const l = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
  const m = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
  const s = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;

  const l_ = l > 0 ? Math.cbrt(l) : 0;
  const m_ = m > 0 ? Math.cbrt(m) : 0;
  const s_ = s > 0 ? Math.cbrt(s) : 0;

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = Math.atan2(bVal, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return {
    l: parseFloat(L.toFixed(3)),
    c: parseFloat(C.toFixed(3)),
    h: parseFloat(H.toFixed(1)),
    css: `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`
  };
}

function oklchToLinearSrgbRaw(l, c, h) {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  const lLms = l + 0.3963377774 * a + 0.2158037573 * b;
  const mLms = l - 0.1055613458 * a - 0.0638541728 * b;
  const sLms = l - 0.0894841775 * a - 1.2914855480 * b;
  const l3 = lLms * lLms * lLms;
  const m3 = mLms * mLms * mLms;
  const s3 = sLms * sLms * sLms;
  return {
    r: +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
  };
}

function inGamut(rgb, eps = 1e-6) {
  return rgb.r >= -eps && rgb.r <= 1 + eps && rgb.g >= -eps && rgb.g <= 1 + eps && rgb.b >= -eps && rgb.b <= 1 + eps;
}

function oklchToLinearSrgb(l, c, h) {
  if (l <= 0) return { r: 0, g: 0, b: 0 };
  if (l >= 1) return { r: 1, g: 1, b: 1 };
  let mappedC = Math.max(0, c);
  if (!inGamut(oklchToLinearSrgbRaw(l, mappedC, h))) {
    let low = 0;
    let high = mappedC;
    for (let i = 0; i < 24; i++) {
      const mid = 0.5 * (low + high);
      if (inGamut(oklchToLinearSrgbRaw(l, mid, h))) low = mid;
      else high = mid;
    }
    mappedC = low;
  }
  const rgb = oklchToLinearSrgbRaw(l, mappedC, h);
  return {
    r: Math.max(0, Math.min(1, rgb.r)),
    g: Math.max(0, Math.min(1, rgb.g)),
    b: Math.max(0, Math.min(1, rgb.b))
  };
}

function oklchLuminance(l, c, h) {
  const rgb = oklchToLinearSrgb(l, c, h);
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

function contrastBetween(c1, c2) {
  const y1 = oklchLuminance(c1.l, c1.c, c1.h);
  const y2 = oklchLuminance(c2.l, c2.c, c2.h);
  return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
}

/**
 * 1D lightness bisection in OKLCh at constant (C, H) so contrast against target meets minRatio.
 */
function bisectLightnessForContrast(source, target, minRatio, moveDarker) {
  const currentRatio = contrastBetween(source, target);
  if (currentRatio >= minRatio) {
    return { ...source, css: `oklch(${source.l.toFixed(3)} ${source.c.toFixed(3)} ${source.h.toFixed(1)})` };
  }
  let low = moveDarker ? 0.05 : source.l;
  let high = moveDarker ? source.l : 0.985;
  for (let i = 0; i < 24; i++) {
    const mid = 0.5 * (low + high);
    const ratio = contrastBetween({ l: mid, c: source.c, h: source.h }, target);
    if (moveDarker) {
      if (ratio >= minRatio) low = mid;
      else high = mid;
    } else {
      if (ratio >= minRatio) high = mid;
      else low = mid;
    }
  }
  const bestL = moveDarker ? low : high;
  return {
    l: parseFloat(bestL.toFixed(3)),
    c: source.c,
    h: source.h,
    css: `oklch(${bestL.toFixed(3)} ${source.c.toFixed(3)} ${source.h.toFixed(1)})`
  };
}

/**
 * Calibrates a Wada color combination into light/dark theme tokens satisfying:
 * 1. light polarity: substrate #FFFFFF, surfaceElevated #F8F8F8, surfaceRecessed below both (the
 *    palette colours never replace the light substrate). Dark mode keeps L(recessed) < L(substrate) < L(elevated).
 * 2. WCAG AAA (>= 7.0:1) for ink100 on all surfaces
 * 3. WCAG AA (>= 4.5:1) for accent foreground on surfaceElevated via 1D lightness bisection
 */
function calibrateWadaTheme(paletteColors) {
  const sortedByLightness = [...paletteColors].sort((a, b) => b.coords.l - a.coords.l);
  const lightest = sortedByLightness[0].coords;
  const secondLight = (sortedByLightness[1] || sortedByLightness[0]).coords;
  const accentSource = (sortedByLightness[sortedByLightness.length - 1] || sortedByLightness[0]).coords;
  const accent2Source = (sortedByLightness[Math.min(2, sortedByLightness.length - 1)] || accentSource).coords;

  // Light mode surfaces: neutral values; their contrast against ink100 is fixed by the core tokens.
  const neutral = (l) => ({ l, c: 0, h: 0, css: `oklch(${l.toFixed(3)} 0.000 0.0)` });
  const subLight = neutral(1);
  const elvLight = neutral(0.98);
  const recLight = neutral(0.958);

  // Dark mode surfaces: L(recessed) < L(substrate) < L(elevated)
  const recDark = { l: 0.120, c: Math.min(secondLight.c, 0.025), h: secondLight.h, css: `oklch(0.120 ${Math.min(secondLight.c, 0.025).toFixed(3)} ${secondLight.h.toFixed(1)})` };
  const subDark = { l: 0.180, c: Math.min(secondLight.c, 0.035), h: secondLight.h, css: `oklch(0.180 ${Math.min(secondLight.c, 0.035).toFixed(3)} ${secondLight.h.toFixed(1)})` };
  const elvDark = { l: 0.240, c: Math.min(lightest.c, 0.045), h: lightest.h, css: `oklch(0.240 ${Math.min(lightest.c, 0.045).toFixed(3)} ${lightest.h.toFixed(1)})` };

  // Calibrate accents via 1D lightness bisection for >= 4.5:1 AA against surfaceElevated
  const accentLight = bisectLightnessForContrast(accentSource, elvLight, 4.5, true);
  const accentDark = bisectLightnessForContrast(accentSource, elvDark, 4.5, false);
  const accent2Light = bisectLightnessForContrast(accent2Source, elvLight, 4.5, true);
  const accent2Dark = bisectLightnessForContrast(accent2Source, elvDark, 4.5, false);

  return {
    substrate: { light: subLight.css, dark: subDark.css },
    surfaceElevated: { light: elvLight.css, dark: elvDark.css },
    surfaceRecessed: { light: recLight.css, dark: recDark.css },
    accent: { light: accentLight.css, dark: accentDark.css },
    accentSecondary: { light: accent2Light.css, dark: accent2Dark.css }
  };
}

const enrichedColors = colors.map(c => {
  const oklch = srgbToOklch(c.rgb[0], c.rgb[1], c.rgb[2]);
  return {
    ...c,
    oklch: oklch.css,
    oklchCoords: { l: oklch.l, c: oklch.c, h: oklch.h }
  };
});

// Tool Definitions
const TOOLS = [
  {
    name: "search_colors",
    description: "Search individual Japanese colors from Sanzo Wada's dictionary by name, hex, or index.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword (e.g. 'pink', 'blue', '#f9c1ce', 'Hermosa Pink', or index 1)."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_color",
    description: "Get comprehensive color data for a specific color (HEX, RGB, CMYK, CIE L*a*b*, OKLCh, and combination occurrences).",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Color name (e.g. 'Hermosa Pink'), hex (e.g. '#f9c1ce'), slug (e.g. 'hermosa-pink'), or index (e.g. 1)."
        }
      },
      required: ["identifier"]
    }
  },
  {
    name: "search_combinations",
    description: "Filter combinations by palette size (2, 3, or 4 colors) or color name.",
    inputSchema: {
      type: "object",
      properties: {
        size: {
          type: "integer",
          enum: [2, 3, 4],
          description: "Filter by palette size: 2, 3, or 4 colors."
        },
        colorName: {
          type: "string",
          description: "Optional color name to search for inside combinations."
        }
      }
    }
  },
  {
    name: "get_combination",
    description: "Get a combination by ID (1 to 348): its size and each color's name, hex, RGB triple, and OKLCh value. Semantic roles come from export_tokens.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          description: "Combination ID from 1 to 348."
        }
      },
      required: ["id"]
    }
  },
  {
    name: "random_combination",
    description: "Get a random historic color harmony for creative inspiration.",
    inputSchema: {
      type: "object",
      properties: {
        size: {
          type: "integer",
          enum: [2, 3, 4],
          description: "Optional filter for random palette size (2, 3, or 4 colors). Other values are rejected."
        }
      }
    }
  },
  {
    name: "export_tokens",
    description: "Export a combination as Design Tokens Format Module 2025.10 JSON, CSS variables, or Tailwind CSS theme.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          description: "Combination ID (1 to 348)."
        },
        format: {
          type: "string",
          enum: ["w3c", "css", "tailwind"],
          description: "Export format: 'w3c' (Design Tokens Format Module 2025.10 JSON), 'css' (CSS Custom Properties), or 'tailwind' (Tailwind CSS theme preset)."
        }
      },
      required: ["id"]
    }
  }
];

/** A failure of a valid tool call (bad argument, unknown record): reported as a result with isError. */
class ToolError extends Error {}

function requireInteger(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ToolError(`${label} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

function handleToolCall(name, args) {
  switch (name) {
    case "search_colors": {
      const q = String(args.query || "").toLowerCase().trim();
      const results = enrichedColors.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.hex.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        String(c.id) === q ||
        `#${c.id}` === q
      );
      return results.map(c => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
        oklch: c.oklch,
        combinationCount: c.combinationIds.length
      }));
    }

    case "get_color": {
      const idStr = String(args.identifier ?? "").toLowerCase().trim();
      if (!idStr) throw new ToolError("identifier is required.");
      let match = null;
      if (/^\d+$/.test(idStr)) {
        match = enrichedColors.find(c => c.id === Number(idStr));
      }
      if (!match) match = enrichedColors.find(c => c.hex.toLowerCase() === (idStr.startsWith('#') ? idStr : `#${idStr}`));
      if (!match) match = enrichedColors.find(c => c.slug.toLowerCase() === idStr);
      if (!match) match = enrichedColors.find(c => c.name.toLowerCase() === idStr);

      if (!match) throw new ToolError(`Color '${args.identifier}' not found.`);
      return match;
    }

    case "search_combinations": {
      let list = catalog;
      if (args.size !== undefined) list = list.filter(p => p.colors.length === requireInteger(args.size, "size", 2, 4));
      if (args.colorName) {
        const q = args.colorName.toLowerCase().trim();
        list = list.filter(p => p.colors.some(c => c.name.toLowerCase().includes(q) || c.hex.toLowerCase() === q));
      }
      return list.map(p => ({
        id: p.id,
        size: p.colors.length,
        colors: p.colors.map(c => ({
          name: c.name,
          hex: c.hex,
          oklch: srgbToOklch(hexToRgb(c.hex).r, hexToRgb(c.hex).g, hexToRgb(c.hex).b).css
        }))
      }));
    }

    case "get_combination": {
      requireInteger(args.id, "id", 1, 348);
      const item = catalog.find(p => p.id === args.id);
      if (!item) throw new ToolError(`Combination #${args.id} not found.`);
      const enriched = item.colors.map(c => {
        const rgb = hexToRgb(c.hex);
        const oklch = srgbToOklch(rgb.r, rgb.g, rgb.b);
        return {
          name: c.name,
          hex: c.hex,
          rgb: [rgb.r, rgb.g, rgb.b],
          oklch: oklch.css
        };
      });
      return {
        id: item.id,
        size: item.colors.length,
        colors: enriched
      };
    }

    case "random_combination": {
      let pool = catalog;
      if (args.size !== undefined) pool = pool.filter(p => p.colors.length === requireInteger(args.size, "size", 2, 4));
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      return handleToolCall("get_combination", { id: chosen.id });
    }

    case "export_tokens": {
      requireInteger(args.id, "id", 1, 348);
      const item = catalog.find(p => p.id === args.id);
      if (!item) throw new ToolError(`Combination #${args.id} not found.`);
      const format = args.format ?? "w3c";
      if (!["w3c", "css", "tailwind"].includes(format)) throw new ToolError("format must be 'w3c', 'css', or 'tailwind'.");

      const enriched = item.colors.map(c => {
        const rgb = hexToRgb(c.hex);
        const coords = srgbToOklch(rgb.r, rgb.g, rgb.b);
        return {
          name: c.name,
          hex: c.hex,
          oklch: coords.css,
          coords
        };
      });

      const calibrated = calibrateWadaTheme(enriched);

      if (format === "css") {
        let css = `/* Judarn Wada Combination #${item.id} (light polarity, WCAG AA/AAA calibrated) */\n:root {\n`;
        enriched.forEach((c, i) => {
          css += `  --color-wada-${i + 1}: ${c.oklch}; /* ${c.name} (${c.hex}) */\n`;
        });
        css += `  --jd-substrate: ${calibrated.substrate.light};\n`;
        css += `  --jd-surface-elevated: ${calibrated.surfaceElevated.light};\n`;
        css += `  --jd-surface-recessed: ${calibrated.surfaceRecessed.light};\n`;
        css += `  --jd-accent: ${calibrated.accent.light};\n`;
        css += `  --jd-accent-2: ${calibrated.accentSecondary.light};\n`;
        css += `}\n[data-theme="dark"] {\n`;
        css += `  --jd-substrate: ${calibrated.substrate.dark};\n`;
        css += `  --jd-surface-elevated: ${calibrated.surfaceElevated.dark};\n`;
        css += `  --jd-surface-recessed: ${calibrated.surfaceRecessed.dark};\n`;
        css += `  --jd-accent: ${calibrated.accent.dark};\n`;
        css += `  --jd-accent-2: ${calibrated.accentSecondary.dark};\n`;
        css += `}\n`;
        return { css, calibrated };
      }

      if (format === "tailwind") {
        const colorsObj = {
          substrate: calibrated.substrate.light,
          elevated: calibrated.surfaceElevated.light,
          recessed: calibrated.surfaceRecessed.light,
          accent: calibrated.accent.light,
          'accent-2': calibrated.accentSecondary.light
        };
        enriched.forEach((c, i) => {
          colorsObj[`wada-${i + 1}`] = c.oklch;
        });
        return {
          tailwind: {
            theme: {
              extend: {
                colors: colorsObj
              }
            }
          },
          calibrated
        };
      }

      // Default: Design Tokens Format Module 2025.10 (Color Module colour objects, gamut-mapped hex).
      const dtcgColor = (css, extras = {}) => {
        const m = css.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
        const [l, c, h] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
        return { "$type": "color", "$value": { colorSpace: "oklch", components: [l, c, h], hex: oklchToHex(l, c, h) }, ...extras };
      };
      const role = (r) => ({ light: dtcgColor(r.light), dark: dtcgColor(r.dark) });
      return {
        "$schema": "https://www.designtokens.org/schemas/2025.10/format.json",
        "theme": `wada-${item.id}`,
        "title": `Sanzo Wada Harmony #${item.id}`,
        "roles": {
          "substrate": role(calibrated.substrate),
          "surfaceElevated": role(calibrated.surfaceElevated),
          "surfaceRecessed": role(calibrated.surfaceRecessed),
          "accent": role(calibrated.accent),
          "accentSecondary": role(calibrated.accentSecondary)
        },
        "color": Object.fromEntries(
          enriched.map((c, i) => [`harmony-${i + 1}`, dtcgColor(c.oklch, { "$description": c.name })])
        )
      };
    }

    default:
      throw new ToolError(`Unknown tool: ${name}`);
  }
}

// JSON-RPC 2.0 Stdio Transport
/** Resolves one parsed request. Returns undefined for notifications, which never receive a reply. */
function handleRequest(req) {
  const isNotification = req.id === undefined;
  const reply = (result) => (isNotification ? undefined : { jsonrpc: "2.0", id: req.id, result });
  const fail = (code, message) => (isNotification ? undefined : { jsonrpc: "2.0", id: req.id, error: { code, message } });

  if (typeof req.method !== "string") return isNotification ? undefined : fail(-32600, "Invalid Request");

  switch (req.method) {
    case "initialize":
      return reply({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "judarn-color-dictionary", version: "0.8.11" }
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const params = req.params;
      if (!params || typeof params.name !== "string") return fail(-32602, "Invalid params: tool name is required");
      const toolArgs = params.arguments ?? {};
      if (typeof toolArgs !== "object" || Array.isArray(toolArgs)) return fail(-32602, "Invalid params: arguments must be an object");
      try {
        const result = handleToolCall(params.name, toolArgs);
        return reply({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (err) {
        if (err instanceof ToolError) {
          return reply({ content: [{ type: "text", text: err.message }], isError: true });
        }
        throw err;
      }
    }
    default:
      return req.method.startsWith("notifications/") ? undefined : fail(-32601, `Method not found: ${req.method}`);
  }
}

function send(message) {
  if (message) process.stdout.write(JSON.stringify(message) + "\n");
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: Invalid JSON" } });
    return;
  }
  if (req === null || typeof req !== "object" || Array.isArray(req)) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } });
    return;
  }
  try {
    send(handleRequest(req));
  } catch (err) {
    if (req.id !== undefined) send({ jsonrpc: "2.0", id: req.id, error: { code: -32603, message: err.message || "Internal error" } });
  }
});
