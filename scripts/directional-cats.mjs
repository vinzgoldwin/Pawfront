/** Layered viewer-facing combat cats. Every layer shares the 150×192 origin.
 * Hands are absent: the renderer attaches them to the equipped weapon.
 * The head covers the ear roots so small rotations cannot open a seam. */
const ink = '#593b29';
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (x,y,rx,ry,fill,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const wrap = s => `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="192" viewBox="0 0 150 192"><g transform="translate(-5 0)" stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${s}</g></svg>`;
const furFor = kind => kind === 'orange' ? '#ffb652' : kind === 'cream' ? '#ffe6b8' : '#fff1cf';
const scarfFor = kind => kind === 'orange' ? '#35b7a4' : kind === 'cream' ? '#4fb1e8' : '#8d9f4a';

function legs(fur, phase = null) {
  const stride = phase === null ? 0 : Math.sin(phase * Math.PI / 4);
  return [56,103].map((hip,index) => {
    const step = stride * (index ? -1 : 1);
    const ankle = hip + step * 3;
    const knee = hip + step * 1.65;
    const foot = 184 - Math.max(0,step) * 6;
    return path(`M${hip-9} 153 Q${knee-10} 165 ${ankle-9} ${foot-6} Q${ankle-12} ${foot+3} ${ankle-2} ${foot+3} L${ankle+10} ${foot+2} Q${ankle+15} ${foot-3} ${ankle+7} ${foot-6} L${knee+8} 158 Z`,fur)
      + path(`M${ankle-2} ${foot-1} L${ankle-2} ${foot+2} M${ankle+4} ${foot-1} L${ankle+4} ${foot+2}`,'none','stroke-width="2"');
  }).join('');
}
function body(kind,phase=null) {
  const fur=furFor(kind),scarf=scarfFor(kind);
  let s=legs(fur,phase);
  s+=path('M53 107 Q78 101 104 108 C115 122 119 140 113 160 Q80 173 44 160 C41 141 42 122 53 107 Z',fur);
  s+=ellipse(79,149,23,18,'#fff0d0','stroke="none"');
  if(kind==='orange')s+=path('M47 140 L53 144 M46 155 L52 158 M108 150 L114 147','none','stroke="#dd8534" stroke-width="5"');
  if(kind==='calico'){
    s+=path('M49 112 Q73 118 91 114 L110 112 L108 155 Q79 164 47 154 Z',scarf);
    s+=path('M79 117 L79 155','none');
    s+=path('M89 141 L102 141 L102 151 L89 151 Z','#b5bd6a');
    s+=ellipse(73,139,2,2,'#eacf69','stroke="none"');
  }else{
    s+=path('M45 106 L110 109 L103 125 L82 139 L66 121 L47 127 L34 122 Z',scarf);
    s+=path('M53 116 L44 132 L32 125 Z',scarf);
  }
  return wrap(s);
}
function tail(kind) {
  const fur=furFor(kind);
  let s=path('M43 165 C17 174 7 158 13 144 C18 132 29 137 29 145 C28 155 38 152 44 144 Z',fur);
  if(kind==='orange')s+=path('M14 143 L27 146 M14 155 L26 157','none','stroke="#d67930" stroke-width="6"');
  if(kind==='calico')s+=path('M17 140 Q10 151 17 160 L28 156 Q23 151 28 144 Z','#a46d44','stroke="none"');
  return wrap(s);
}
function ears(kind) {
  const fur=furFor(kind);
  const leftFill=kind==='calico'?'#f8a449':fur;
  const rightFill=kind==='calico'?'#855841':fur;
  const left=path('M24 62 Q17 34 28 8 Q39 6 58 29 L62 60 Z',leftFill)
    +path('M29 20 L32 46 L49 31 Z','#f78c75','stroke="none"');
  const right=path('M99 32 Q116 6 130 5 Q142 17 137 49 L133 68 L104 58 Z',rightFill)
    +path('M124 17 L111 31 L133 39 Z','#f78c75','stroke="none"');
  return {left:wrap(left),right:wrap(right)};
}
function head(kind) {
  const fur=furFor(kind);
  const outline='M25 52 Q23 34 48 28 Q78 20 104 28 Q130 31 138 52 Q151 65 145 84 Q141 109 110 115 Q75 123 42 111 Q13 103 17 80 Q17 65 25 52 Z';
  let s=`<defs><clipPath id="head"><path d="${outline}"/></clipPath></defs>`;
  s+=path(outline,fur);
  let markings='';
  if(kind==='orange')markings+=path('M63 26 L70 41 M77 25 L84 40 M91 26 L97 39 M20 74 L35 76 M21 88 L33 85 M134 70 L145 67 M134 81 L145 84','none','stroke="#d8782a" stroke-width="6"');
  if(kind==='calico'){
    markings+=path('M25 35 Q40 22 57 28 Q57 45 36 55 L20 59 Z','#f8a449','stroke="none"');
    markings+=path('M111 29 Q131 31 138 51 L147 72 Q119 72 111 52 Z','#855841','stroke="none"');
  }
  if(kind==='cream'){
    markings+=path('M66 25 Q74 13 81 21 L78 28 Q92 20 94 30','none','stroke="#e6af6d" stroke-width="3"');
    markings+=path('M23 87 L35 88 M132 85 L142 88','none','stroke="#ecba79" stroke-width="4"');
  }
  s+=`<g clip-path="url(#head)">${markings}</g>`;
  s+=ellipse(80,97,34,18,'#fff0d0','stroke="none"');
  s+=ellipse(57,77,5,7,'#513522','stroke="none"')+ellipse(112,74,5,7,'#513522','stroke="none"');
  s+=path('M80 86 Q84 83 88 86 L84 90 Z','#775039','stroke="none"');
  s+=path('M84 89 Q84 99 75 94 M84 90 Q89 100 95 92','none','stroke-width="2.8"');
  return wrap(s);
}
export function layeredCats(kind) {
  const ear=ears(kind);
  const art={
    [`${kind}-body`]:body(kind),
    [`${kind}-head`]:head(kind),
    [`${kind}-ear-left`]:ear.left,
    [`${kind}-ear-right`]:ear.right,
    [`${kind}-tail`]:tail(kind),
  };
  for(let frame=0;frame<8;frame++)art[`${kind}-body-walk${frame}`]=body(kind,frame);
  return art;
}
