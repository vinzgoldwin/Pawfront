import { CAT_FUR, WEAPONS, drawArt, type Images } from "./assets";
import { catMotion } from "./cat-motion";
import type { CatId, WeaponId } from "./config";
import { weaponPose, type Point, type WeaponPose, type FacingSector } from "./geometry";

interface CatPlayer extends Point { angle: number; moving: boolean; recoil: number; walk?: number; shotAge?: number; gunSide?: number; facingSector?: FacingSector }
const INK = "#593b29";
/** Fixed shoulders, outward elbows and tapered wrists keep the hold anatomical. */
function arm(c: CanvasRenderingContext2D, shoulder: Point, hand: Point, fur: string, outside: number) {
  const elbow = { x: shoulder.x + outside * 2, y: Math.max(shoulder.y + 8, hand.y + 1) };
  c.fillStyle = fur;
  c.strokeStyle = INK;
  c.lineWidth = 1.1;
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(shoulder.x - 2.8, shoulder.y);
  c.quadraticCurveTo(elbow.x - 3, elbow.y, hand.x - 2, hand.y + 2);
  c.quadraticCurveTo(hand.x, hand.y + 3, hand.x + 2, hand.y - 1);
  c.quadraticCurveTo(elbow.x + 3, elbow.y - 1, shoulder.x + 2.8, shoulder.y);
  c.closePath();
  c.fill(); c.stroke();
}
function paw(c: CanvasRenderingContext2D, hand: Point, fur: string, angle: number) {
  c.save();
  c.translate(hand.x, hand.y);
  c.rotate(angle);
  c.fillStyle = fur;
  c.strokeStyle = INK;
  c.lineWidth = 1.1;
  c.beginPath();
  c.ellipse(0, 0, 2.8, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(1, 1); c.lineTo(1, 2);
  c.strokeStyle = "#aa774b";
  c.lineWidth = 0.6;
  c.stroke();
  c.restore();
}

/** The caller owns the ground shadow and any hit/defeat opacity or transform. */
export function drawCat(
  c: CanvasRenderingContext2D, images: Images, player: CatPlayer,
  cat: CatId, weapon: WeaponId, _target: Point | null, time: number, reduced: boolean,
): WeaponPose {
  const pose = weaponPose(player, cat, weapon, null, player.angle);
  const fur = CAT_FUR[cat];
  const recoil = reduced ? 0 : Math.min(1, player.recoil / 0.11) * 1.4;
  const offset = { x: -Math.cos(pose.angle) * recoil, y: -Math.sin(pose.angle) * recoil };
  const nearHand = { x: pose.nearHand.x + offset.x, y: pose.nearHand.y + offset.y };
  const farHand = { x: pose.farHand.x + offset.x, y: pose.farHand.y + offset.y };
  const frame = player.moving && !reduced ? `-walk${Math.floor((player.walk ?? 0) / 8) % 8}` : "";
  const motion = catMotion(player.angle, player.walk ?? 0, player.moving, player.shotAge ?? 1, time, reduced);
  const layer = (name: string, pivot: readonly [number, number] = [75, 187], rotation = 0) => {
    c.save();
    c.translate(player.x + (pivot[0] - 75) / 3, player.y + (pivot[1] - 188) / 3);
    c.rotate(rotation);
    drawArt(c, images[`${cat}-${name}` as keyof Images], -pivot[0] / 3, -pivot[1] / 3, 50, 64);
    c.restore();
  };
  const body = () => {
    layer("tail", [38, 153], motion.tail);
    layer(`body${frame}`);
  };
  const head = () => {
    // The cat performs toward the viewer in every aim direction. Only the gun
    // turns away; the head, ear roots and markings stay one coherent assembly.
    const pivot = { x: player.x, y: player.y - 80 / 3 };
    c.save();
    c.translate(pivot.x + motion.headX, pivot.y + motion.headY);
    c.rotate(motion.headTilt);
    c.translate(-pivot.x, -pivot.y);
    layer("ear-left", [31, 43], motion.leftEar);
    layer("ear-right", [119, 43], motion.rightEar);
    layer("head");
    c.restore();
  };
  const gun = () => {
    const w = WEAPONS[weapon], height = pose.height, width = pose.width;
    c.save();
    c.translate(pose.grip.x + offset.x, pose.grip.y + offset.y);
    c.rotate(pose.angle);
    c.scale(1, pose.facing);
    drawArt(c, images[`${weapon}-${pose.facingSector}`], -w.grip[0] * width, -w.grip[1] * height, width, height);
    c.restore();
  };
  const flash = () => {
    if (player.recoil <= 0.065) return;
    const x = pose.muzzle.x + offset.x, y = pose.muzzle.y + offset.y;
    c.save();
    c.translate(x, y);
    c.rotate(pose.angle);
    c.scale(pose.width / WEAPONS[weapon].width, 1);
    c.fillStyle = "#fff8ac";
    c.strokeStyle = "#edb539";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -2); c.lineTo(4, -4); c.lineTo(3, -1);
    c.lineTo(reduced ? 7 : 10, 0); c.lineTo(3, 1); c.lineTo(4, 4); c.lineTo(0, 2);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  };
  c.save();
  body();
  // Both wrists disappear beneath the receiver, then the paws wrap over their
  // own grip. No forearm is painted across the top of the gun or the face.
  arm(c, pose.farShoulder, farHand, fur, pose.facing);
  arm(c, pose.nearShoulder, nearHand, fur, -pose.facing);
  gun();
  paw(c, farHand, fur, pose.angle);
  paw(c, nearHand, fur, pose.angle);
  flash();
  head();
  c.restore();
  return pose;
}
