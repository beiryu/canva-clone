import { fabric } from "fabric";

import {
  FONT_SIZE,
  TextEffect,
  TextEffectOptions,
} from "@/features/editor/types";

/**
 * Text effects are drawn by patching `fabric.Text.prototype` rather than by
 * subclassing Textbox.
 *
 * A subclass would need its own `type`, and three things key off that:
 * `isTextType()` only accepts text/i-text/textbox, every `changeFont*` editor
 * method acts on the selected object, and `loadFromJSON` resolves classes by
 * `type` — so existing saved projects would stop round-tripping. Patching keeps
 * `type: "textbox"` and leaves all of it alone. Objects with no `textEffect`
 * render exactly as before.
 *
 * Two methods are patched, and the second is the non-obvious one:
 *
 * - `_render` draws Echo and Background behind the glyphs.
 * - `shouldCache` turns fabric's object cache OFF for those two effects. This is
 *   not an optimisation choice, it is load-bearing — see installTextEffects.
 */

type EffectText = fabric.Text & {
  textEffect?: TextEffect;
  textEffectOptions?: TextEffectOptions;
  // fabric's typings don't expose these internals, but they are the documented
  // render/geometry helpers used by _renderTextLinesBackground.
  _textLines: string[][];
  _getLeftOffset: () => number;
  _getTopOffset: () => number;
  _getLineLeftOffset: (lineIndex: number) => number;
  getHeightOfLine: (lineIndex: number) => number;
  getLineWidth: (lineIndex: number) => number;
  _setTextStyles: (ctx: CanvasRenderingContext2D) => void;
  _renderText: (ctx: CanvasRenderingContext2D) => void;
};

/** Prototype members @types/fabric 5.3.0 does not declare. */
type TextProtoInternals = {
  cacheProperties: string[];
  shouldCache: (this: EffectText) => boolean;
  ownCaching?: boolean;
};

/** Echo draws this many offset copies behind the glyphs, like Canva's. */
const ECHO_STEPS = 2;
/** How much each successive copy fades, as a fraction per step. */
const ECHO_FADE = 0.35;

/** `offset: 100` displaces by half an em. */
const OFFSET_EM_AT_MAX = 0.5;
/** `blur: 100` blurs by one em. */
const BLUR_EM_AT_MAX = 1;

/**
 * Canva-style controls give an offset length plus a direction angle; fabric and
 * canvas both want x/y. 0 degrees points right, angles increase clockwise
 * (screen coordinates, so y grows downward).
 *
 * `offset` is a percentage of the font size rather than a pixel count, so one
 * value reads correctly at any type size. Object scale is applied on top of this
 * for free: drawEcho runs inside the object's transform, and fabric's
 * `_setShadow` multiplies shadow offsets by `getObjectScaling()`.
 */
export const offsetToXY = (
  offset: number,
  direction: number,
  fontSize: number,
) => {
  const radians = (direction * Math.PI) / 180;
  const distance = (offset / 100) * fontSize * OFFSET_EM_AT_MAX;

  // Deliberately not rounded: these are single-digit floats now, and both
  // consumers (ctx.translate, fabric.Shadow) take fractions happily. Rounding
  // would quantise small offsets away entirely.
  return {
    offsetX: Math.cos(radians) * distance,
    offsetY: Math.sin(radians) * distance,
  };
};

/** Blur is a percentage of the font size, for the same reason as offset. */
export const blurToPixels = (blur: number, fontSize: number) =>
  (blur / 100) * fontSize * BLUR_EM_AT_MAX;

/**
 * `transparency` is 0-100 where 100 is invisible, matching Canva and the
 * control's own label.
 */
const withAlpha = (color: string, transparency: number): string => {
  const opacity = 1 - Math.max(0, Math.min(100, transparency)) / 100;

  try {
    // getSource() returns [r, g, b, a] with a in 0-1, carrying whatever alpha
    // the ColorPicker produced. Multiply rather than overwrite it, so the slider
    // reads as "how much of the colour you picked" instead of silently forcing a
    // translucent swatch back to opaque.
    const [r, g, b, a] = new fabric.Color(color).getSource();
    // Rounded because these strings are serialised into the saved shadow, and
    // float noise turns 0.45 into 0.44999999999999996.
    const alpha = Math.round(a * opacity * 1000) / 1000;
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return color;
  }
};

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  // A radius over half the shorter side produces self-intersecting arcs.
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

/** How far the background box extends past the glyphs, scaled to the type. */
const backgroundPad = (spread: number, fontSize: number) => ({
  padX: (spread / 100) * fontSize * 0.5,
  padY: (spread / 100) * fontSize * 0.25,
});

/**
 * One rounded box per line, sized to that line's own width — not a single box
 * over the whole block, which is what makes multi-line text look wrong.
 */
const drawBackground = (
  text: EffectText,
  ctx: CanvasRenderingContext2D,
  options: TextEffectOptions,
) => {
  const { roundness, spread, transparency, color } = options;

  // fabric always populates these at construction; the typings mark them
  // optional because they're settable.
  const fontSize = text.fontSize ?? FONT_SIZE;
  const lineHeight = text.lineHeight || 1;

  const { padX, padY } = backgroundPad(spread, fontSize);
  const leftOffset = text._getLeftOffset();
  let lineTop = text._getTopOffset();

  ctx.save();
  ctx.fillStyle = withAlpha(color, transparency);

  for (let i = 0; i < text._textLines.length; i++) {
    const heightOfLine = text.getHeightOfLine(i);
    const lineWidth = text.getLineWidth(i);

    // Skip blank lines; a bare box floating on an empty line reads as a bug.
    if (lineWidth > 0) {
      const boxHeight = heightOfLine / lineHeight + padY * 2;

      roundedRect(
        ctx,
        leftOffset + text._getLineLeftOffset(i) - padX,
        lineTop - padY,
        lineWidth + padX * 2,
        boxHeight,
        // Roundness is a percentage of the maximum sane radius, so 100 always
        // gives a pill regardless of font size.
        (roundness / 100) * (boxHeight / 2),
      );
      ctx.fill();
    }

    lineTop += heightOfLine;
  }

  ctx.restore();
};

/**
 * Offset copies of the glyphs behind the real text. `this.fill` is swapped
 * because `_renderTextFill` reads that property rather than `ctx.fillStyle`.
 *
 * Caveat: per-character `styles` entries with their own `fill` still win inside
 * `_renderChar`, so an echo behind mixed-colour text keeps the original per-char
 * colours.
 */
const drawEcho = (
  text: EffectText,
  ctx: CanvasRenderingContext2D,
  options: TextEffectOptions,
) => {
  const { offset, direction, transparency, color } = options;
  const fontSize = text.fontSize ?? FONT_SIZE;
  const { offsetX, offsetY } = offsetToXY(offset, direction, fontSize);

  // A sub-quarter-pixel offset is indistinguishable from none, and the values
  // are floats now, so an exact === 0 test would miss it.
  if (Math.abs(offsetX) < 0.25 && Math.abs(offsetY) < 0.25) return;

  const originalFill = text.fill;
  const originalStroke = text.stroke;
  const echoColor = withAlpha(color, transparency);
  // Echo is uncached (see installTextEffects), so this is the live canvas
  // context and fabric's _setOpacity has already multiplied the object's own
  // opacity into globalAlpha. Assigning would throw that away; multiply instead.
  const baseAlpha = ctx.globalAlpha;

  try {
    // Furthest copy first so nearer copies paint over it.
    for (let step = ECHO_STEPS; step >= 1; step--) {
      const ratio = step / ECHO_STEPS;

      ctx.save();
      ctx.translate(offsetX * ratio, offsetY * ratio);
      // Fade with distance so the stack reads as an echo rather than as clones.
      ctx.globalAlpha = baseAlpha * (1 - ratio * ECHO_FADE);

      text.fill = echoColor;
      // _renderText also strokes when stroke/strokeWidth are set. Without this
      // every copy repeats the original outline colour, which reads as a
      // rendering artefact rather than as an echo.
      text.stroke = echoColor;
      // The patch runs before the original _render, which is what normally
      // installs the font/baseline on the context — do it here or the copies
      // render with whatever the previous object left behind.
      text._setTextStyles(ctx);
      text._renderText(ctx);

      ctx.restore();
    }
  } finally {
    text.fill = originalFill;
    text.stroke = originalStroke;
  }
};

/**
 * Builds the fabric.Shadow for the Drop effect. Drop is the one effect fabric
 * supports natively, and `shadow` is serialised by default — no JSON_KEYS entry
 * needed for it.
 *
 * `fontSize` comes from the object rather than the options, so a multi-selection
 * of 16px and 96px text gets proportionally matching shadows.
 *
 * Note that `_setShadow` applies the offset in device space, so a drop shadow
 * does not rotate with the object, whereas Echo (drawn inside the object's
 * transform) does. That is fabric's behaviour, and roughly Canva's.
 */
export const buildDropShadow = (
  options: TextEffectOptions,
  fontSize: number,
): fabric.Shadow => {
  const { offset, direction, blur, transparency, color } = options;
  const { offsetX, offsetY } = offsetToXY(offset, direction, fontSize);

  return new fabric.Shadow({
    color: withAlpha(color, transparency),
    blur: blurToPixels(blur, fontSize),
    offsetX,
    offsetY,
  });
};

/** Effects drawn by hand, whose ink falls outside fabric's cache canvas. */
const isDirectRenderEffect = (effect: TextEffect | undefined) =>
  effect === "echo" || effect === "background";

/**
 * The flag lives on `fabric` rather than in module scope because Next's Fast
 * Refresh can hand back a fresh copy of this module while the `fabric` import
 * stays cached — a module-scoped boolean would then double-wrap the patches,
 * rendering every effect twice.
 */
const INSTALLED_FLAG = "__textEffectsInstalled" as const;

/** Installed once, as a side effect of importing the editor hook. */
export const installTextEffects = () => {
  const registry = fabric as unknown as Record<string, boolean>;
  if (registry[INSTALLED_FLAG]) return;
  registry[INSTALLED_FLAG] = true;

  const textProto = fabric.Text.prototype as unknown as fabric.Text &
    TextProtoInternals;

  const originalRender = fabric.Text.prototype._render;
  const originalShouldCache = textProto.shouldCache;

  fabric.Text.prototype._render = function (
    this: EffectText,
    ctx: CanvasRenderingContext2D,
  ) {
    const effect = this.textEffect;
    const options = this.textEffectOptions;

    // Drop is handled by fabric's own shadow, so only these two need drawing.
    if (options && (effect === "background" || effect === "echo")) {
      if (effect === "background") drawBackground(this, ctx, options);
      if (effect === "echo") drawEcho(this, ctx, options);
    }

    originalRender.call(this, ctx);
  };

  /**
   * Echo and Background must render straight onto the target context. Two
   * independent reasons, both fatal:
   *
   * 1. fabric only marks an object dirty when a mutated key appears in
   *    `cacheProperties`, and `textEffect`/`textEffectOptions` are not fabric's
   *    properties. A cached bitmap would therefore never refresh when a tile is
   *    clicked or a slider moves — the effect only ever appeared after a reload,
   *    which rebuilds objects whose `dirty` starts true.
   * 2. the cache canvas is sized to the glyph box plus fontSize/2 per side
   *    (fabric.Text#_getCacheCanvasDimensions) ≈ 17px at the default 32px type.
   *    An echo copy displaced by half an em, or a wide background box, is
   *    cropped at that boundary.
   *
   * fabric.Image does exactly this for exactly this kind of reason. Leaving the
   * uncached state repaints correctly with no manual flag: `_createCacheCanvas`
   * ends with `dirty = true`.
   *
   * Drop stays cached on purpose. `_setShadow` runs on the main context before
   * the cache is blitted, so the shadow is neither stale nor clipped — and going
   * uncached would regress it, because `_renderTextStroke` calls
   * `_removeShadow(ctx)` outside its own save(), stripping the shadow from the
   * decoration passes that follow.
   */
  textProto.shouldCache = function (this: EffectText) {
    if (isDirectRenderEffect(this.textEffect)) {
      (this as EffectText & TextProtoInternals).ownCaching = false;
      return false;
    }

    return originalShouldCache.call(this);
  };

  // Belt and braces for any future effect that IS cacheable (a glow built from
  // nothing but a native shadow, say). Text's array is its own
  // `fabric.Object.prototype.cacheProperties.concat(...)`, so extending it here
  // cannot leak into Rect/Image/etc; IText and Textbox declare none of their own
  // and inherit this one.
  //
  // Not sufficient for grouped text: fabric.Group's cacheProperties is empty and
  // a child only propagates `dirty` upward for `stateProperties` keys. There is
  // no grouping UI today.
  textProto.cacheProperties = textProto.cacheProperties.concat(
    "textEffect",
    "textEffectOptions",
  );
};
