/** Cosmetic motion uses simulation time, so pause and hiding freeze every layer. */
export function catMotion(angle: number, walk: number, moving: boolean, shotAge: number, time: number, reduced: boolean) {
  if (reduced) return { headTilt: 0, headX: 0, headY: 0, tail: 0, leftEar: 0, rightEar: 0 };
  const stride = moving ? Math.sin(walk * Math.PI / 32) : 0;
  const kick = Math.sin(Math.min(1, shotAge) * 28) * Math.exp(-Math.min(1, shotAge) * 12);
  // An occasional paired ear flick, with a soft start and finish. No random
  // values or render-frame accumulation: captures and reduced motion are stable.
  const flick = (offset: number) => {
    const phase = (time + offset) % 6.8;
    return phase < .48 ? Math.sin(phase / .48 * Math.PI) ** 2 : 0;
  };
  return {
    headTilt: Math.cos(angle) * .04 + stride * .012 - Math.cos(angle) * kick * .045,
    headX: Math.cos(angle) * .7,
    headY: -Math.abs(stride) * .35 + kick * .4,
    tail: Math.sin(time * 2.5) * .10 + stride * .08 + kick * .10,
    leftEar: -.13 * flick(0) - kick * .13,
    rightEar: .11 * flick(.12) + kick * .10,
  };
}
