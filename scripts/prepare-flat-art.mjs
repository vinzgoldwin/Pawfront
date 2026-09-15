/** Flat production redraws. Originals remain in Assets; no color keying or halo filter. */
import sharp from "sharp";
import { packArt } from "./pack-art.mjs";
import { directionalGuns } from "./directional-guns.mjs";
import { layeredCats } from "./directional-cats.mjs";
import { directionalEnemies, enemyCanvasSizes } from "./directional-enemies.mjs";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
const ink = "#593b29";
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const p = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
const e = (cx, cy, rx, ry, fill, extra = "") =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const c = (cx, cy, r, fill, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
function cat(kind) {
  const base =
    kind === "orange" ? "#ffb652" : kind === "cream" ? "#ffe6b8" : "#fff1cf";
  const scarf =
    kind === "orange" ? "#35b7a4" : kind === "cream" ? "#4fb1e8" : "#8d9f4a";
  let s = p(
    "M40 164 C12 170 3 155 10 142 C15 132 25 137 26 144 C25 153 36 151 42 145",
    base,
  );
  if (kind === "orange")
    s += p(
      "M11 140 L24 143 M10 153 L22 155",
      "none",
      'stroke="#d67930" stroke-width="6"',
    );
  if (kind === "calico")
    s += p(
      "M12 139 Q5 148 12 157 L23 155 Q18 149 24 143 Z",
      "#a46d44",
      'stroke="none"',
    );
  s += p(
    "M53 112 C42 122 41 141 44 163 L40 178 Q41 190 57 187 L67 180 Q81 185 94 180 Q99 191 114 187 Q125 185 119 175 L113 161 C119 140 115 122 104 113 Z",
    base,
  );
  s += e(79, 154, 23, 25, "#fff0d0", 'stroke="none"');
  if (kind === "orange")
    s += p(
      "M47 140 L53 144 M46 155 L52 158 M108 150 L114 147",
      "none",
      'stroke="#dd8534" stroke-width="5"',
    );
  if (kind === "calico")
    s +=
      p("M49 118 Q73 121 91 118 L110 115 L108 155 Q79 164 47 154 Z", scarf) +
      p("M79 120 L79 155", "none") +
      p("M89 141 L102 141 L102 151 L89 151 Z", "#b5bd6a") +
      c(73, 139, 2, "#eacf69", 'stroke="none"');
  else
    s +=
      p("M45 106 L110 109 L103 125 L82 139 L66 121 L47 127 L34 122 Z", scarf) +
      p("M53 116 L44 132 L32 125 Z", scarf);
  s += e(56, 143, 13, 12, base) + e(113, 139, 11, 12, base);
  s += p(
    "M25 61 Q17 34 28 8 Q39 6 56 27 Q78 20 101 26 Q118 6 130 4 Q142 17 137 47 Q151 65 145 84 Q141 109 110 115 Q75 123 42 111 Q13 103 17 80 Q17 68 25 61 Z",
    base,
  );
  s +=
    p("M29 20 L32 46 L49 31 Z", "#f78c75", 'stroke="none"') +
    p("M124 17 L111 31 L133 39 Z", "#f78c75", 'stroke="none"');
  if (kind === "orange")
    s += p(
      "M63 26 L70 41 M77 25 L84 40 M91 26 L97 39 M20 74 L35 76 M21 88 L33 85 M134 70 L145 67 M134 81 L145 84",
      "none",
      'stroke="#d8782a" stroke-width="6"',
    );
  if (kind === "calico")
    s +=
      p(
        "M27 11 Q44 14 57 28 Q57 45 36 55 L20 59 Q17 39 27 11 Z",
        "#f8a449",
        'stroke="none"',
      ) +
      p(
        "M111 22 L128 7 Q143 17 137 48 L147 72 Q119 72 111 52 Z",
        "#855841",
        'stroke="none"',
      ) +
      p("M29 20 L32 46 L49 31 Z", "#f78c75", 'stroke="none"') +
      p("M124 17 L111 31 L133 39 Z", "#f78c75", 'stroke="none"');
  if (kind === "cream")
    s +=
      p(
        "M66 25 Q74 13 81 21 L78 28 Q92 20 94 30",
        "none",
        'stroke="#e6af6d" stroke-width="3"',
      ) +
      p(
        "M23 87 L35 88 M132 85 L142 88",
        "none",
        'stroke="#ecba79" stroke-width="4"',
      );
  s +=
    e(80, 97, 34, 18, "#fff0d0", 'stroke="none"') +
    e(57, 77, 5, 7, "#513522", 'stroke="none"') +
    e(112, 74, 5, 7, "#513522", 'stroke="none"');
  s +=
    p("M80 86 Q84 83 88 86 L84 90 Z", "#775039", 'stroke="none"') +
    p("M84 89 Q84 99 75 94 M84 90 Q89 100 95 92", "none", 'stroke-width="2.8"');
  s += p(
    "M48 181 L48 185 M55 181 L55 186 M108 181 L108 186",
    "none",
    'stroke-width="2"',
  );
  return svg(150, 192, s);
}
const art = {
  orange: cat("orange"),
  calico: cat("calico"),
  cream: cat("cream"),
};
for (const kind of ["orange", "calico", "cream"]) Object.assign(art, layeredCats(kind));
art.mushroom = svg(
  192,
  178,
  p(
    "M61 140 L56 157 Q54 168 65 169 L79 157 M123 139 L138 157 Q142 167 132 169 L115 156",
    "#f6d7a0",
  ) +
    p(
      "M62 89 Q52 114 68 140 Q81 158 107 151 Q125 148 129 128 L147 135 Q162 130 148 122 L128 115 L119 91 Z",
      "#ffe3b5",
    ) +
    p(
      "M15 89 Q10 70 35 49 Q68 9 94 19 Q119 35 160 32 L177 20 Q190 47 158 56 Q187 74 167 93 Q99 119 28 105 Z",
      "#d86137",
    ) +
    p("M16 91 Q79 72 166 89 L165 98 Q91 121 28 105 Z", "#f4b06b") +
    e(62, 44, 20, 9, "#ffa55e", 'stroke="none"') +
    e(123, 64, 20, 11, "#ffaf65", 'stroke="none"') +
    p(
      "M71 119 L80 124 L72 128 M105 119 L98 125 L106 129",
      "none",
      'stroke-width="3"',
    ) +
    p("M83 135 Q89 141 95 133", "none", 'stroke-width="2.5"'),
);
art.sprout = svg(
  133,
  192,
  p("M64 68 Q61 40 76 25", "none", 'stroke="#698338" stroke-width="6"') +
    p("M69 42 Q69 7 115 6 Q119 39 77 43 Z", "#8faa47") +
    p("M63 49 Q24 61 9 28 Q39 14 63 49 Z", "#a8bf57") +
    p(
      "M63 47 L37 33 M78 34 L103 17",
      "none",
      'stroke="#70873b" stroke-width="2.5"',
    ) +
    p(
      "M41 156 L32 174 Q29 184 40 184 L54 173 M82 164 L87 184 Q99 192 105 181 L99 161",
      "#a7b557",
    ) +
    p(
      "M39 82 Q48 67 69 68 Q91 66 99 92 L116 131 Q130 165 99 172 Q69 184 33 165 Q17 148 24 124 Z",
      "#aaba57",
    ) +
    e(66, 152, 31, 21, "#e8dda1", 'stroke="none"') +
    p(
      "M27 127 Q13 126 15 141 Q17 150 25 145 M107 129 Q119 127 116 144 Q112 151 105 144",
      "#acb959",
    ) +
    p("M44 111 L50 115 M84 111 L78 115", "none", 'stroke-width="3"') +
    e(48, 119, 3, 5, ink, 'stroke="none"') +
    e(81, 118, 3, 5, ink, 'stroke="none"') +
    p("M62 132 Q66 137 71 131", "none", 'stroke-width="2.5"') +
    c(40, 92, 5, "#c8cf75", 'stroke="none"') +
    c(93, 103, 4, "#829b48", 'stroke="none"'),
);
art.acorn = svg(
  192,
  185,
  p("M123 42 L137 12 Q145 4 156 15 L145 43", "#96603e") +
    p(
      "M45 144 L41 164 Q33 177 50 179 L67 173 L69 155 M128 146 L130 168 Q130 180 147 179 L157 172 L147 151",
      "#945c38",
    ) +
    e(97, 120, 65, 48, "#cd8a49") +
    e(94, 139, 44, 24, "#efc689", 'stroke="none"') +
    p(
      "M24 116 Q7 123 12 140 Q24 153 38 137 M148 122 Q166 112 176 128 Q181 145 161 147",
      "#9f623d",
    ) +
    p(
      "M21 96 Q29 43 83 33 Q126 18 159 50 Q180 71 182 110 Q171 127 150 112 Q135 119 122 107 Q103 116 89 104 Q71 116 57 104 Q37 115 21 102 Z",
      "#805537",
    ) +
    p("M28 78 Q44 48 74 43 Q86 66 74 79 Q47 91 28 78 Z", "#a77449") +
    p("M75 43 Q99 28 122 40 Q141 62 119 77 Q98 87 75 71 Z", "#a77449") +
    p("M123 42 Q148 40 163 66 Q176 86 165 97 Q145 101 129 83 Z", "#976440") +
    p("M60 117 L69 120 M105 117 L98 120", "none", 'stroke-width="4"') +
    e(68, 125, 4, 5, ink, 'stroke="none"') +
    e(102, 125, 4, 5, ink, 'stroke="none"') +
    p("M78 138 Q84 132 90 138", "none", 'stroke-width="2.5"'),
);
art.boss = svg(
  384,
  344,
  p(
    "M157 265 L139 309 L125 326 Q134 340 154 329 L172 333 L192 322 L180 286 M251 267 L258 307 L276 325 Q267 339 248 330 L228 334 L207 322 L217 288",
    "#8b5937",
  ) +
    p(
      "M112 125 Q88 118 64 151 L28 171 Q7 195 21 221 Q44 244 73 218 L99 213 L135 184 M270 132 Q297 126 319 161 L350 179 Q379 194 365 224 Q348 248 318 226 L288 218 L255 187",
      "#95613b",
    ) +
    e(53, 197, 25, 33, "#b7824b") +
    e(53, 197, 15, 20, "#d7aa67") +
    e(338, 207, 25, 34, "#b7824b") +
    e(338, 207, 14, 20, "#d7aa67") +
    p(
      "M130 75 L126 113 L113 135 L125 173 L118 212 L134 259 L159 276 L185 293 L215 283 L245 290 L266 260 L276 218 L264 184 L277 142 L261 99 L256 76 Z",
      "#ac733f",
    ) +
    p(
      "M130 75 L152 84 L169 68 L188 79 L210 69 L230 82 L253 75 Q255 58 222 51 Q168 40 130 64 Z",
      "#e6b979",
    ) +
    p(
      "M158 68 Q185 53 226 67 M166 112 L169 134 M238 110 L231 133 M149 223 L161 248 M234 214 L226 254",
      "none",
      'stroke="#825534" stroke-width="5"',
    ) +
    e(165, 172, 8, 9, "#f5de9d", 'stroke="none"') +
    e(232, 172, 8, 9, "#f5de9d", 'stroke="none"') +
    e(168, 173, 3, 6, ink, 'stroke="none"') +
    e(229, 173, 3, 6, ink, 'stroke="none"') +
    p("M143 157 L177 166 M217 166 L249 155", "none", 'stroke-width="6"') +
    p(
      "M178 195 L190 188 L201 196 L211 189 L222 197",
      "none",
      'stroke-width="5"',
    ) +
    p("M187 51 L183 29 L192 16", "none", 'stroke="#738847" stroke-width="6"') +
    p("M184 39 Q155 38 154 10 Q179 8 184 39 Z", "#8b9e4f") +
    p("M190 32 Q196 9 221 15 Q216 40 190 32 Z", "#a7b761") +
    p(
      "M108 145 Q76 149 77 119 Q101 117 108 145 Z M278 165 Q293 131 312 143 Q307 171 278 165 Z M121 251 Q109 235 98 248 Q99 266 121 251 Z M260 245 Q283 224 288 244 Q280 260 260 245 Z",
      "#899b4c",
    ) +
    p(
      "M126 116 L122 139 L132 158 M267 184 L258 209 L263 229",
      "none",
      'stroke="#cf9453" stroke-width="6"',
    ),
);
art.wood = svg(
  192,
  76,
  p("M7 31 Q2 31 4 42 L6 63 Q7 68 16 65 L69 46 L77 33 Z", "#b57236") +
    p("M7 32 L15 33 L18 62 L8 65 Z", "#79614b") +
    p("M74 41 L64 69 Q62 74 73 73 L86 68 L92 43", "#a86930") +
    p("M87 41 Q83 65 102 62 Q114 59 109 44", "none", 'stroke-width="4"') +
    p("M86 41 L91 53 L98 54", "none", 'stroke="#d4ae62" stroke-width="3"') +
    p(
      "M68 25 L86 17 L131 17 L137 26 L162 27 L165 49 L137 50 L130 56 L80 54 L67 44 Z",
      "#746553",
    ) +
    p("M88 16 L93 7 L119 7 L120 17", "#b77b3a") +
    p("M136 27 L180 24 L184 51 L139 51 Z", "#81735b") +
    p(
      "M110 22 L110 48 M123 24 L123 46",
      "none",
      'stroke="#544331" stroke-width="4"',
    ) +
    e(181, 37, 7, 17, "#e9b94f") +
    e(182, 37, 3, 11, "#5c452a", 'stroke="none"') +
    c(23, 44, 4, "#f5c56a", 'stroke-width="2"'),
);
art.coral = svg(
  192,
  151,
  p(
    "M62 82 L42 130 Q36 138 49 144 L69 148 Q77 148 79 139 L92 91 Z",
    "#ed795c",
  ) +
    p("M65 84 L47 125 Q42 132 51 136 L58 136 L76 91 Z", "#fff0ce") +
    p("M90 84 Q85 107 101 107 Q124 110 123 86", "none", 'stroke-width="5"') +
    p("M95 85 L99 98 L106 98", "none", 'stroke="#e67756" stroke-width="5"') +
    p("M47 27 Q44 11 61 9 L87 9 Q103 11 105 29", "#ef795a") +
    e(17, 56, 12, 18, "#ed775a") +
    p(
      "M23 40 Q30 22 61 22 L125 23 Q143 23 144 47 L142 78 Q140 91 111 93 L58 91 Q24 86 23 64 Z",
      "#fff0cf",
    ) +
    p(
      "M43 33 L100 32 Q118 34 118 52 L116 70 Q114 82 100 81 L44 79 Q34 76 34 61 L34 49 Q33 39 43 33 Z",
      "#f7e2bd",
      'stroke="#c69d75" stroke-width="2.5"',
    ) +
    c(58, 56, 13, "#b7edb5") +
    c(58, 56, 8, "#60d9ab", 'stroke="none"') +
    p(
      "M82 49 L82 64 M93 49 L93 64 M104 49 L104 64",
      "none",
      'stroke="#b59573" stroke-width="4"',
    ) +
    p("M130 31 L156 24 L163 86 L132 86 Q122 63 130 31 Z", "#efddba") +
    p(
      "M151 29 Q159 17 177 24 Q189 39 188 58 Q188 82 179 91 Q169 96 151 87 Q141 65 151 29 Z",
      "#f47b58",
    ) +
    e(177, 57, 10, 29, "#cc4f36") +
    e(178, 57, 5, 20, "#593929", 'stroke="none"'),
);
art.fish = svg(
  192,
  139,
  p("M57 83 L43 121 Q44 131 62 133 L79 130 L85 88 Z", "#a8713c") +
    p(
      "M56 113 L59 123 M71 113 L70 123",
      "none",
      'stroke="#d49a51" stroke-width="3"',
    ) +
    p("M89 86 Q85 115 108 110 Q123 107 121 88", "none", 'stroke-width="4"') +
    p("M94 88 L100 101 L107 100", "none", 'stroke="#e6c280" stroke-width="3"') +
    p("M26 65 Q15 56 17 76 Q17 85 28 84", "#c6b795") +
    p(
      "M35 33 L129 35 L133 90 Q122 100 48 97 Q27 91 28 74 L27 48 Z",
      "#78aac4",
    ) +
    p(
      "M29 43 Q76 55 130 43 M34 85 Q78 98 129 85",
      "none",
      'stroke="#bad8df" stroke-width="3"',
    ) +
    e(79, 34, 51, 12, "#e4d7b6") +
    e(79, 34, 40, 6, "#a4a398", 'stroke-width="2"') +
    p("M43 33 L27 26 Q21 22 29 19 Q43 18 62 28 L59 35 Z", "#ded2b3") +
    e(36, 25, 7, 2.5, "#a99c82", 'stroke-width="2"') +
    p("M132 54 L170 55 L173 83 L133 83 Z", "#ebd7aa") +
    p("M171 52 L183 53 L187 82 L173 85 Z", "#e9b451") +
    e(184, 68, 5, 14, "#825739") +
    e(185, 68, 2, 9, "#4c3729", 'stroke="none"') +
    e(80, 70, 24, 11, "#f2e8cb", 'stroke="#567f97" stroke-width="2"') +
    p(
      "M59 70 L49 61 L50 78 Z",
      "#f2e8cb",
      'stroke="#567f97" stroke-width="2"',
    ) +
    c(94, 68, 2, "#547188", 'stroke="none"'),
);
const canopy = (x, y, scale, fill) =>
  `<g transform="translate(${x} ${y}) scale(${scale})">${p("M-38 10 Q-58 3 -47 -13 Q-59 -30 -35 -35 Q-31 -52 -12 -47 Q3 -65 21 -47 Q42 -48 45 -28 Q67 -16 51 3 Q53 21 33 24 Q26 43 7 33 Q-13 45 -26 30 Q-48 35 -38 10 Z", fill)}</g>`;
art.tree = svg(
  384,
  382,
  p(
    "M157 240 L160 309 L142 349 Q143 372 172 365 Q185 376 200 363 Q217 374 234 360 L220 337 L217 251 Z",
    "#a87747",
  ) +
    p(
      "M189 285 L184 334 M212 321 L205 350",
      "none",
      'stroke="#7e5435" stroke-width="5"',
    ) +
    canopy(193, 130, 1.7, "#92a958") +
    canopy(110, 210, 1.4, "#8a9f52") +
    canopy(270, 212, 1.45, "#81984f") +
    canopy(192, 252, 1.2, "#a2b35e") +
    p(
      "M141 83 Q156 64 175 77 M232 179 Q249 163 264 176 M75 195 Q87 179 103 191",
      "none",
      'stroke="#b6c471" stroke-width="11"',
    ),
);
art.pine = svg(
  267,
  384,
  p(
    "M112 307 L102 358 Q111 376 128 368 Q146 380 164 363 L153 303 Z",
    "#a57849",
  ) +
    p("M130 335 L125 361", "none", 'stroke="#775538" stroke-width="4"') +
    p(
      "M111 224 L61 279 L19 315 Q20 335 55 329 Q80 350 114 331 Q139 352 164 331 Q193 345 208 327 Q240 335 245 317 L194 264 L152 220 Z",
      "#8ca05a",
    ) +
    p(
      "M114 156 L68 205 L34 238 Q27 258 58 258 Q82 281 109 264 Q137 288 164 262 Q189 279 211 261 Q235 263 232 246 L197 208 L151 152 Z",
      "#9fb164",
    ) +
    p(
      "M117 88 L74 136 L49 165 Q44 185 73 184 Q89 202 116 187 Q138 210 159 189 Q181 205 199 185 Q225 185 215 167 L189 137 L150 88 Z",
      "#8fa556",
    ) +
    p(
      "M124 13 Q132 0 140 14 L171 64 L194 88 Q199 107 177 105 Q165 120 145 108 Q126 126 108 107 Q76 113 78 95 L102 57 Z",
      "#b5bf6f",
    ) +
    p(
      "M111 284 L95 303 M175 234 L187 249 M109 148 L98 162",
      "none",
      'stroke="#c4cc87" stroke-width="7"',
    ),
);
art.rock = svg(
  256,
  208,
  p(
    "M21 129 L36 76 L82 32 L163 16 L204 44 L232 94 L246 148 L216 177 L155 195 L74 189 L29 163 Z",
    "#a89984",
  ) +
    p(
      "M36 76 L83 34 L163 18 L202 46 L188 95 L137 122 L65 116 Z",
      "#d4c5ad",
      'stroke="none"',
    ) +
    p("M26 129 L70 116 L88 158 L74 186 L32 161 Z", "#958675", 'stroke="none"') +
    p(
      "M137 126 L190 99 L229 100 L242 147 L214 174 L158 191 Z",
      "#8b8072",
      'stroke="none"',
    ) +
    p(
      "M49 79 L77 65 M140 47 L166 42",
      "none",
      'stroke="#b7a891" stroke-width="6"',
    ) +
    p(
      "M21 129 L36 76 L82 32 L163 16 L204 44 L232 94 L246 148 L216 177 L155 195 L74 189 L29 163 Z",
      "none",
    ),
);
art["small-rock"] = svg(
  256,
  154,
  p(
    "M17 92 L34 58 L86 23 L147 18 L204 40 L238 81 L242 106 L215 128 L147 138 L70 129 L23 114 Z",
    "#a69a83",
  ) +
    p(
      "M35 59 L86 25 L147 21 L202 42 L218 76 L175 103 L104 97 L48 81 Z",
      "#d8c7a8",
      'stroke="none"',
    ) +
    p("M42 84 L90 96 L77 127 L27 113 Z", "#baaa91", 'stroke="none"') +
    p(
      "M174 106 L217 79 L238 96 L237 106 L213 126 L151 136 Z",
      "#897f6e",
      'stroke="none"',
    ) +
    p(
      "M70 58 L89 49 M138 45 L151 49",
      "none",
      'stroke="#b5a68d" stroke-width="5"',
    ) +
    p(
      "M17 92 L34 58 L86 23 L147 18 L204 40 L238 81 L242 106 L215 128 L147 138 L70 129 L23 114 Z",
      "none",
    ),
);
art.bush = svg(
  256,
  149,
  canopy(130, 75, 1.1, "#9bad5b") +
    canopy(60, 96, 1.02, "#8b9e4e") +
    canopy(190, 99, 1.02, "#a5b45e") +
    p(
      "M39 88 Q49 72 64 83 M111 39 Q124 28 139 42 M183 91 Q195 76 210 88",
      "none",
      'stroke="#c1c97e" stroke-width="7"',
    ),
);
Object.assign(art, directionalEnemies(art));
for (const kind of ["wood", "coral", "fish"]) Object.assign(art, directionalGuns(kind, art[kind]));
await mkdir("public/art/flat", { recursive: true });
// Remove only superseded generated cat views. Supplied originals and UI icons
// remain untouched; combat uses the smaller viewer-facing layer set.
for (const directory of ["public/art", "public/art/flat"]) {
  for (const name of await readdir(directory)) {
    if (/^(orange|calico|cream)-(front|back|left|right)(-walk[0-7])?\.(png|svg)$/.test(name))
      await rm(`${directory}/${name}`);
  }
}
const report = [];
for (const [name, source] of Object.entries(art)) {
  await writeFile(`public/art/flat/${name}.svg`, source + "\n");
  const sizes = {
    orange: [145, 192],
    calico: [153, 192],
    cream: [149, 192],
    mushroom: [192, 177],
    sprout: [133, 192],
    acorn: [192, 185],
    boss: [384, 344],
    tree: [384, 381],
    pine: [267, 384],
    rock: [256, 208],
    "small-rock": [256, 154],
    bush: [256, 149],
    wood: [192, 76],
    coral: [192, 151],
    fish: [192, 139],
  };
  const prefix = name.split("-")[0];
  const [width, height] = sizes[name] ?? enemyCanvasSizes[prefix] ?? (["wood", "coral", "fish"].includes(prefix) ? sizes[prefix] : [150, 192]);
  await sharp(Buffer.from(source))
    .resize({
      width,
      height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(`public/art/${name}.png`);
  report.push({
    name,
    source: `public/art/flat/${name}.svg`,
    width,
    height,
    style: "flat vector redraw",
    originalPreserved: true,
  });
}
await writeFile(
  "public/art/flat/preparation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Prepared ${report.length} flat transparent sprites; originals preserved.`,
);

await packArt(report);
