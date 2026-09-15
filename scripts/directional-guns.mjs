/** Authored overhead/underside gun surfaces. Barrel direction is always +X in
 * source space; grip, support hand and muzzle coordinates match the profiles.
 * The renderer rotates rigidly and mirrors only its local vertical axis. */
const ink = '#593b29';
const p = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const e = (x,y,rx,ry,fill,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const wrap = (h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="${h}" viewBox="0 0 192 ${h}"><g stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
function wood(rear) {
 let s = p('M7 32 L66 26 L78 40 L64 50 L8 63 Q2 52 7 32 Z', '#b57236');
 s += p('M7 32 L16 34 L17 59 L8 63 Z', '#79614b');
 s += p('M72 44 L65 69 Q65 74 75 72 L86 67 L91 45 Z', '#a86930');
 s += p('M90 43 Q83 63 100 63 Q114 62 109 44', 'none');
 s += p('M66 29 L87 20 L128 20 L143 29 L143 47 L126 55 L80 53 L66 43 Z', '#746553');
 s += p(rear ? 'M67 29 L87 17 L126 17 L144 29 L127 39 L81 39 Z' : 'M80 41 L127 40 L145 29 L143 47 L126 55 L80 53 Z', rear ? '#a18c68' : '#584f43');
 s += p('M93 20 L98 9 L119 9 L123 20 Z', '#b77b3a');
 s += p('M137 29 L180 24 L184 50 L139 48 Z', '#81735b');
 s += p('M140 30 L178 27 L180 34 L142 36 Z', rear ? '#b6a07a' : '#968363', 'stroke="none"');
 s += p('M107 23 L107 49 M121 24 L121 49', 'none', 'stroke="#544331" stroke-width="4"');
 s += e(182,37,rear ? 4 : 7, rear ? 13 : 17,'#e9b94f');
 s += e(183,37,rear ? 1.7 : 4,rear ? 8 : 11,'#5c452a','stroke="none"');
 s += e(23,44,4,4,'#f5c56a','stroke-width="2"');
 return wrap(76,s);
}
function coral(rear) {
 let s = p('M62 83 L43 131 Q40 140 54 144 L70 146 L80 137 L91 90 Z', '#ed795c');
 s += p('M63 87 L49 126 L57 135 L68 99 Z', '#fff0ce');
 s += p('M91 86 Q85 108 104 107 Q123 109 122 85', 'none', 'stroke-width="5"');
 s += p('M47 29 Q44 14 59 10 L86 10 Q101 12 105 29 Z', '#ef795a');
 s += e(17,57,11,16,'#ed775a');
 s += p('M24 43 Q35 25 62 24 L124 25 Q145 26 144 48 L143 78 Q135 94 108 93 L57 89 Q22 83 24 43 Z', '#fff0cf');
 s += p(rear ? 'M26 43 Q45 20 71 25 L122 25 Q140 29 143 47 L119 55 L49 52 Z' : 'M25 66 L48 75 L119 79 L143 66 L143 78 Q135 94 108 93 L57 89 Q32 87 25 66 Z', rear ? '#fff9dd' : '#d9bb91');
 s += p('M46 50 L111 50 L115 71 L43 73 Z', '#f7e2bd','stroke="#c69d75" stroke-width="2.5"');
 s += e(58,57,12,rear ? 8 : 12,'#b7edb5');
 s += e(58,57,7,rear ? 4 : 7,'#60d9ab','stroke="none"');
 s += p('M83 53 L83 66 M94 53 L94 66 M105 53 L105 66', 'none', 'stroke="#b59573" stroke-width="4"');
 s += p('M132 33 L159 29 L164 84 L132 85 Q124 61 132 33 Z', '#efddba');
 s += p('M155 29 Q169 22 180 31 Q190 52 184 77 Q179 90 156 85 Q143 60 155 29 Z', '#f47b58');
 s += e(179,57,rear ? 5 : 10,rear ? 23 : 28,'#cc4f36');
 s += e(181,57,rear ? 2 : 5,rear ? 16 : 20,'#593929','stroke="none"');
 return wrap(151,s);
}
function fish(rear) {
 let s = p('M57 84 L44 120 Q44 132 62 132 L78 129 L85 89 Z', '#a8713c');
 s += p('M55 116 L59 124 M70 115 L70 124', 'none', 'stroke="#d49a51" stroke-width="3"');
 s += p('M89 88 Q85 114 106 111 Q123 110 121 87', 'none');
 s += e(23,73,8,12,'#c6b795');
 s += p('M34 36 L128 36 L133 88 Q123 102 48 96 Q28 90 28 74 L28 48 Z', '#78aac4');
 s += p('M32 76 Q72 88 130 76 L131 87 Q96 104 47 95 Q32 89 32 76 Z', '#54879f','stroke="none"');
 s += e(79,35,50,rear ? 16 : 9,'#e4d7b6');
 s += e(79,35,39,rear ? 10 : 4,'#a4a398','stroke-width="2"');
 s += p('M45 33 L27 26 Q21 22 29 19 Q43 18 62 28 L59 35 Z', '#ded2b3');
 s += e(36,25,7,2.5,'#a99c82','stroke-width="2"');
 s += p('M133 55 L171 55 L173 82 L133 82 Z', '#ebd7aa');
 s += p('M135 55 L170 56 L171 62 L135 63 Z', '#fff0c8','stroke="none"');
 s += p('M171 53 L184 55 L187 81 L173 84 Z', '#e9b451');
 s += e(184,68,rear ? 3 : 4,rear ? 11 : 14,'#825739');
 s += e(185.8,68,rear ? 1.2 : 1.8,8,'#4c3729','stroke="none"');
 s += e(80,70,24,rear ? 8 : 11,'#f2e8cb','stroke="#567f97" stroke-width="2"');
 s += p('M59 70 L49 62 L50 77 Z', '#f2e8cb','stroke="#567f97" stroke-width="2"');
 s += e(94,68,2,2,'#547188','stroke="none"');
 return wrap(139,s);
}
export function directionalGuns(kind, profile) {
 const view = { wood, coral, fish }[kind];
 return { [`${kind}-right`]:profile, [`${kind}-left`]:profile,
   [`${kind}-front`]:view(false), [`${kind}-back`]:view(true) };
}
