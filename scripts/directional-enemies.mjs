/** Directional views retain the front sprites' canvases and ground baselines. */
export const enemyCanvasSizes = {
  mushroom: [192, 177], sprout: [133, 192], acorn: [192, 185], boss: [384, 344],
};
const ink = '#593b29';
const p = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const e = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const line = (d, width = 3.5, color = ink) => p(d, 'none', `stroke="${color}" stroke-width="${width}"`);
const wrap = (kind, source, flip = false) => {
  const [w, h] = enemyCanvasSizes[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${flip ? `<g transform="translate(${w} 0) scale(-1 1)">${source}</g>` : source}</g></svg>`;
};
// Delete authored facial marks by their identifying geometry, never paint over
// them with a flat rectangle that could cover an outline or leave a halo.
const removeMarks = (source, starts) => source.replace(/<(?:path|ellipse)\b[^>]*\/>/g, tag =>
  starts.some(prefix => tag.includes(prefix)) ? '' : tag);
const append = (source, body) => source.replace('</g></svg>', `${body}</g></svg>`);

// Feet are separate pieces tucked beneath the body. The planted foot stays at
// the original baseline while the opposite leg swings from its hip.
const feet = {
  mushroom: {
    fill: '#f6d7a0', prefixes: ['d="M61 140', 'd="M63 137'],
    front: ['M61 140 L56 157 Q54 168 65 169 L79 157 Z', 'M123 139 L138 157 Q142 167 132 169 L115 156 Z'],
    side: ['M63 137 L52 157 Q47 168 61 169 L83 156 Z', 'M105 142 L120 158 Q128 171 139 166 Q144 162 135 156 L127 138 Z'],
    hips: [[68, 141], [118, 142]],
  },
  sprout: {
    fill: '#a7b557', prefixes: ['d="M41 156', 'd="M48 156'],
    front: ['M41 156 L32 174 Q29 184 40 184 L54 173 Z', 'M82 164 L87 184 Q99 192 105 181 L99 161 Z'],
    side: ['M48 156 L38 175 Q34 186 47 184 L63 172 Z', 'M77 161 L91 179 Q104 190 110 179 L96 157 Z'],
    hips: [[48, 160], [89, 164]],
  },
  acorn: {
    fill: '#945c38', prefixes: ['d="M45 144', 'd="M63 146'],
    front: ['M45 144 L41 164 Q33 177 50 179 L67 173 L69 155 Z', 'M128 146 L130 168 Q130 180 147 179 L157 172 L147 151 Z'],
    side: ['M63 146 L53 168 Q47 178 61 179 L82 172 L84 153 Z', 'M113 147 L128 166 Q127 179 145 179 L156 173 L139 150 Z'],
    hips: [[59, 148], [137, 150]],
  },
  boss: {
    fill: '#8b5937', prefixes: ['d="M157 265', 'd="M160 260'],
    front: ['M157 265 L139 309 L125 326 Q134 340 154 329 L172 333 L192 322 L180 286 Z', 'M251 267 L258 307 L276 325 Q267 339 248 330 L228 334 L207 322 L217 288 Z'],
    side: ['M160 260 L146 305 L127 325 Q134 339 153 329 L174 333 L194 321 L185 282 Z', 'M235 264 L242 307 L268 325 Q258 339 242 330 L222 334 L205 321 L214 282 Z'],
    hips: [[170, 275], [229, 277]],
  },
};
function walkFrame(source, kind, side, step) {
  const spec = feet[kind];
  const stride = side ? 9 : 5;
  const sign = Math.sin(step * Math.PI / 4);
  const legs = (side ? spec.side : spec.front).map((d, i) => {
    const swing = i === 0 ? sign : -sign;
    const [x, y] = spec.hips[i];
    const lift = Math.min(0, swing) * (kind === 'boss' ? 7 : 4);
    return `<g transform="translate(0 ${lift}) rotate(${swing * stride} ${x} ${y})">${p(d, spec.fill)}</g>`;
  }).join('');
  let result = removeMarks(source, spec.prefixes).replace(/(<g\b[^>]*>)/, `$1${legs}`);
  // Profile arms swing at their shoulder rather than moving the whole body.
  const arm = {mushroom: ['d="M76 125', 76, 125], sprout: ['d="M53 129', 53, 129],
    acorn: ['d="M78 125', 78, 125], boss: ['d="M223 183', 223, 183]}[kind];
  if (side) result = result.replace(/<(?:path|ellipse)\b[^>]*\/>/g, tag => {
    const nearFist = kind === 'boss' && (tag.includes('cx="310" cy="244"') || tag.includes('cx="316" cy="244"'));
    if (tag.includes(arm[0]) || nearFist)
      return `<g transform="rotate(${sign * 5} ${arm[1]} ${arm[2]})">${tag}</g>`;
    if (kind === 'boss' && (tag.includes('d="M140 129') || tag.includes('cx="80" cy="203"')))
      return `<g transform="rotate(${-sign * 5} 140 129)">${tag}</g>`;
    return tag;
  });
  return result;
}
function mirror(source, width) {
  return source.replace(/(<g\b[^>]*>)/, `$1<g transform="translate(${width} 0) scale(-1 1)">`)
    .replace('</g></svg>', '</g></g></svg>');
}

export function directionalEnemies(front) {
  const sides = {};
  sides.mushroom =
    p('M63 137 L52 157 Q47 168 61 169 L83 156 M105 142 L120 158 Q128 171 139 166 Q144 162 135 156 L127 138', '#f6d7a0') +
    p('M64 90 Q55 111 66 137 Q83 157 109 151 Q131 146 138 129 L152 125 Q164 118 153 111 L138 108 L129 89 Z', '#ffe3b5') +
    p('M76 125 Q63 117 58 127 Q56 139 69 138', '#f6d7a0') +
    p('M14 89 Q12 69 38 48 Q73 11 97 20 Q127 37 157 31 L176 20 Q188 44 160 55 Q188 72 167 92 Q104 118 29 104 Z', '#d86137') +
    p('M15 90 Q83 78 169 87 L167 97 Q102 115 29 104 Z', '#f4b06b') +
    e(70, 42, 22, 9, '#ffa55e', 'stroke="none"') +
    e(135, 64, 16, 11, '#ffaf65', 'stroke="none"') +
    line('M124 113 L135 119', 3) + e(134, 123, 3.8, 5, ink, 'stroke="none"') +
    line('M142 132 Q146 137 152 131', 2.5);

  sides.sprout =
    line('M65 72 Q61 42 78 26', 6, '#698338') +
    p('M71 44 Q77 9 119 14 Q117 43 77 46 Z', '#8faa47') +
    p('M65 50 Q25 55 14 24 Q44 17 65 50 Z', '#a8bf57') +
    line('M76 38 L106 22 M59 44 L35 30', 2.5, '#70873b') +
    p('M48 156 L38 175 Q34 186 47 184 L63 172 M77 161 L91 179 Q104 190 110 179 L96 157', '#a7b557') +
    p('M43 81 Q51 68 72 68 Q94 68 99 93 L104 108 L116 118 Q124 127 114 134 L118 148 Q117 171 94 173 Q65 179 36 163 Q21 148 27 122 Z', '#aaba57') +
    p('M97 136 Q116 132 117 149 Q117 166 98 172 Q87 161 88 150 Z', '#e8dda1', 'stroke="none"') +
    p('M53 129 Q38 122 37 137 Q38 149 49 145', '#acb959') +
    line('M86 112 L96 114', 3) + e(96, 120, 3, 5, ink, 'stroke="none"') +
    line('M108 131 Q113 136 117 130', 2.5) +
    e(45, 96, 5, 5, '#c8cf75', 'stroke="none"') + e(76, 88, 4, 4, '#829b48', 'stroke="none"');

  sides.acorn =
    p('M113 44 L126 13 Q134 5 145 15 L136 47', '#96603e') +
    p('M63 146 L53 168 Q47 178 61 179 L82 172 L84 153 M113 147 L128 166 Q127 179 145 179 L156 173 L139 150', '#945c38') +
    p('M47 103 Q48 77 86 74 Q119 74 143 103 L155 118 Q165 127 153 134 Q152 157 128 165 Q101 176 69 161 Q42 143 47 103 Z', '#cd8a49') +
    p('M137 126 Q155 128 150 143 Q145 159 126 165 Q116 153 121 142 Z', '#efc689', 'stroke="none"') +
    p('M78 125 Q65 112 54 125 Q48 143 64 147 Q82 148 82 133', '#9f623d') +
    p('M31 95 Q32 46 85 33 Q123 21 153 49 Q172 69 180 110 Q170 123 152 110 Q136 118 123 105 Q105 114 90 103 Q73 113 58 103 Q42 111 31 101 Z', '#805537') +
    p('M36 77 Q45 51 75 43 Q87 61 76 79 Q54 91 36 77 Z', '#a77449') +
    p('M78 42 Q98 31 119 40 Q137 62 119 77 Q99 87 80 70 Z', '#a77449') +
    p('M124 43 Q146 43 161 68 Q174 89 164 97 Q145 99 131 82 Z', '#976440') +
    line('M125 116 L138 119', 4) + e(139, 125, 4, 5, ink, 'stroke="none"') +
    line('M147 141 L153 137', 2.5);

  sides.boss =
    p('M160 260 L146 305 L127 325 Q134 339 153 329 L174 333 L194 321 L185 282 M235 264 L242 307 L268 325 Q258 339 242 330 L222 334 L205 321 L214 282', '#8b5937') +
    p('M140 129 Q111 123 86 152 L64 181 Q44 203 65 222 Q91 240 113 216 L148 190', '#95613b') +
    e(80, 203, 22, 29, '#b7824b') +
    p('M153 74 L147 108 L136 142 L143 183 L137 222 L151 262 L174 282 L200 292 L224 282 L246 288 L260 256 L267 219 L260 192 L281 181 L279 166 L262 152 L268 133 L258 100 L254 76 Z', '#ac733f') +
    p('M152 74 L174 83 L191 69 L209 80 L230 70 L254 76 Q253 55 222 51 Q180 43 152 63 Z', '#e6b979') +
    line('M170 66 Q191 53 229 65 M163 111 L166 136 M152 211 L160 246 M225 236 L220 264', 5, '#825534') +
    e(251, 167, 8, 9, '#f5de9d', 'stroke="none"') + e(254, 167, 3, 6, ink, 'stroke="none"') +
    line('M231 151 L263 158', 6) + line('M260 182 L269 177 L277 183', 4) +
    p('M223 183 Q245 174 272 196 L292 212 Q324 213 332 236 Q339 266 315 276 Q292 287 273 262 L247 249 L222 220 Z', '#95613b') +
    e(310, 244, 25, 34, '#b7824b') + e(316, 244, 13, 22, '#d7aa67') +
    line('M200 51 L198 30 L207 17', 6, '#738847') +
    p('M199 39 Q170 39 169 11 Q193 10 199 39 Z', '#8b9e4f') +
    p('M204 33 Q211 10 236 17 Q230 41 204 33 Z', '#a7b761') +
    p('M136 143 Q108 143 110 115 Q136 118 136 143 Z M260 145 Q279 118 296 132 Q289 156 260 145 Z M143 246 Q128 229 119 245 Q125 264 143 246 Z', '#899b4c') +
    line('M142 145 L153 164 M252 245 L244 264', 6, '#cf9453');

  const backs = {};
  backs.mushroom = append(removeMarks(front.mushroom, [
    'd="M71 119', 'd="M83 135',
  ]), line('M84 114 Q79 126 84 140 M100 115 Q96 131 103 141', 2.5, '#d6ac79'));
  backs.sprout = append(removeMarks(front.sprout, [
    'cx="66" cy="152"', 'd="M44 111', 'cx="48" cy="119"',
    'cx="81" cy="118"', 'd="M62 132',
  ]), line('M65 87 Q58 116 63 155', 3, '#879d46') +
    p('M64 111 Q45 107 40 94 Q57 96 64 111 Z M61 131 Q81 128 91 113 Q71 115 61 131 Z', '#bdc970', 'stroke="none"'));
  backs.acorn = append(removeMarks(front.acorn, [
    'cx="94" cy="139"', 'd="M60 117', 'cx="68" cy="125"',
    'cx="102" cy="125"', 'd="M78 138',
  ]), line('M69 117 Q66 138 74 155 M94 113 L94 161 M119 117 Q126 138 118 155', 3, '#a96e3c'));
  backs.boss = append(removeMarks(front.boss, [
    'cx="165" cy="172"', 'cx="232" cy="172"', 'cx="168" cy="173"',
    'cx="229" cy="173"', 'd="M143 157', 'd="M178 195',
    'cx="53" cy="197" rx="15"', 'cx="338" cy="207" rx="14"',
  ]), line('M172 112 L160 151 L169 188 L161 223 M217 108 L226 146 L215 179 L225 219 M188 147 L183 168 L190 190 L184 222 L193 254', 5, '#825534') +
    p('M192 128 Q176 108 163 122 Q168 143 192 128 Z M222 221 Q245 205 249 224 Q237 243 222 221 Z', '#899b4c'));
  const art = {};
  for (const kind of Object.keys(enemyCanvasSizes)) {
    art[`${kind}-front`] = front[kind];
    art[`${kind}-back`] = backs[kind];
    art[`${kind}-right`] = wrap(kind, sides[kind]);
    art[`${kind}-left`] = wrap(kind, sides[kind], true);
    for (let step = 0; step < 8; step++) {
      art[`${kind}-front-walk${step}`] = walkFrame(front[kind], kind, false, step);
      art[`${kind}-back-walk${step}`] = walkFrame(backs[kind], kind, false, step);
      const right = walkFrame(art[`${kind}-right`], kind, true, step);
      art[`${kind}-right-walk${step}`] = right;
      art[`${kind}-left-walk${step}`] = mirror(right, enemyCanvasSizes[kind][0]);
    }
  }
  return art;
}
