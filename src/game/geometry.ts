import { type WeaponId, type CatId } from "./config";
import { WEAPONS } from "./assets";
export interface Point {
  x: number;
  y: number;
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function segmentHit(
  a: Point,
  b: Point,
  c: Point,
  radius: number,
): number | null {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    fx = a.x - c.x,
    fy = a.y - c.y;
  const aa = dx * dx + dy * dy,
    cc = fx * fx + fy * fy - radius * radius;
  if (cc <= 0) return 0;
  if (!aa) return null;
  const bb = 2 * (fx * dx + fy * dy),
    disc = bb * bb - 4 * aa * cc;
  if (disc < 0) return null;
  const t = (-bb - Math.sqrt(disc)) / (2 * aa);
  return t >= 0 && t <= 1 ? t : null;
}
export type FacingSector = "front" | "back" | "left" | "right";
export interface WeaponPose {
  grip: Point;
  nearHand: Point;
  farHand: Point;
  nearShoulder: Point;
  farShoulder: Point;
  angle: number;
  facing: number;
  facingSector: FacingSector;
  muzzle: Point;
  width: number;
  height: number;
}
type PosePlayer = Point & { gunSide?: number; facingSector?: FacingSector };
/** Enemy body / gun surface views, with overlap to prevent boundary flicker. */
export function facingSectorFor(angle: number, previous?: FacingSector): FacingSector {
  // Raised barrels use their upper surface earlier than the front surface.
  const backEdge = Math.asin(.6);
  const ranges: Record<FacingSector, readonly [number, number]> = {
    right: [-backEdge, Math.PI / 4],
    front: [Math.PI / 4, Math.PI * 3 / 4],
    left: [Math.PI * 3 / 4, Math.PI + backEdge],
    back: [-Math.PI + backEdge, -backEdge],
  };
  const delta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  if (previous) {
    const [lo, hi] = ranges[previous];
    if (Math.abs(delta(angle, (lo + hi) / 2)) < (hi - lo) / 2 + .12) return previous;
  }
  return Math.sin(angle) < -.6 ? "back" : Math.sin(angle) > Math.SQRT1_2
    ? "front" : Math.cos(angle) >= 0 ? "right" : "left";
}
function heldPose(player: PosePlayer, id: WeaponId, angle: number): WeaponPose {
  const up = Math.max(0, -Math.sin(angle));
  const side = player.gunSide ?? (Math.cos(angle) >= 0 ? 1 : -1);
  const facing = side >= 0 ? 1 : -1;
  const facingSector = player.facingSector ?? facingSectorFor(angle);
  const weapon = WEAPONS[id];
  // The cat holds the receiver across its belly. A barrel aimed away from
  // the viewer is foreshortened, rather than hoisted beside the face.
  const width = weapon.width * (1 - .52 * up * up - .28 * Math.max(0, Math.sin(angle)) ** 2);
  const height = weapon.width / weapon.aspect;
  const grip = { x: player.x - 2 * Math.cos(angle), y: player.y - 10 };
  const local = (point: readonly [number, number]) => ({
    x: (point[0] - weapon.grip[0]) * width,
    y: (point[1] - weapon.grip[1]) * height * facing,
  });
  const transform = (point: Point): Point => ({
    x: grip.x + Math.cos(angle) * point.x - Math.sin(angle) * point.y,
    y: grip.y + Math.sin(angle) * point.x + Math.cos(angle) * point.y,
  });
  return {
    grip, nearHand: grip, farHand: transform(local(weapon.support)),
    nearShoulder: { x: player.x - 10 * facing, y: player.y - 21 },
    farShoulder: { x: player.x + 10 * facing, y: player.y - 21 },
    angle, facing, facingSector, width, height, muzzle: transform(local(weapon.muzzle)),
  };
}
/** Desired barrel angle. Both the stock position and barrel offset depend on
 * heading, so converge their short fixed-point solve before turning the actor. */
export function aimingAngle(player: PosePlayer, _cat: CatId, id: WeaponId,
  target: Point, previousAngle = 0): number {
  let angle = Math.atan2(target.y - (player.y - 18), target.x - player.x);
  player = { ...player, gunSide: player.gunSide ?? (Math.cos(angle) >= 0 ? 1 : -1) };
  for (let i = 0; i < 20; i++) {
    const pose = heldPose(player, id, angle);
    const dx = target.x - pose.grip.x, dy = target.y - pose.grip.y;
    if (Math.hypot(dx, dy) < 1) return previousAngle;
    const weapon = WEAPONS[id];
    const offsetY = (weapon.muzzle[1] - weapon.grip[1]) * weapon.width / weapon.aspect * pose.facing;
    const next = Math.atan2(dy, dx) - Math.asin(Math.max(-1, Math.min(1, offsetY / Math.hypot(dx, dy))));
    if (Math.abs(next - angle) < 1e-12) return next;
    angle = next;
  }
  return angle;
}
/** With null target, this is the authoritative physical/render pose at the
 * actor's smoothed angle. The optional target form is useful for pose previews. */
export function weaponPose(player: PosePlayer, cat: CatId, id: WeaponId,
  target: Point | null, previousAngle = 0): WeaponPose {
  if (target && player.gunSide === undefined) {
    const heading = Math.atan2(target.y - (player.y - 18), target.x - player.x);
    player = { ...player, gunSide: Math.cos(heading) >= 0 ? 1 : -1 };
  }
  return heldPose(player, id, target ? aimingAngle(player, cat, id, target, previousAngle) : previousAngle);
}
