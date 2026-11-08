
/* art/props.js: generated from the single-file build, code unchanged */
const PROPS={
 mug:(S,K)=>`<path d="M0 0H80V80Q80 100 60 100H20Q0 100 0 80Z" fill="${K.c('#F7E01B')}" ${S}/><path d="M80 18Q116 18 116 50Q116 80 80 76" fill="none" ${S} stroke-width="${K.sw*1.6}"/><path d="M20 -14Q10 -30 24 -44M48 -14Q38 -30 52 -44" fill="none" ${S}/>`,
 phone:(S,K)=>`<rect width="70" height="128" rx="14" fill="${K.line}" ${S}/><rect x="6" y="10" width="58" height="104" rx="6" fill="${K.c('#7FD6E8')}"/><circle cx="35" cy="118" r="4" fill="${K.paper}"/>`,
 book:(S,K)=>`<path d="M0 10L60 0L120 10V100L60 90L0 100Z" fill="${K.c('#EF5B45')}" ${S}/><path d="M60 0V90" ${S} fill="none"/><path d="M14 30L50 24M14 48L50 42M70 24L106 30M70 42L106 48" ${S} fill="none" stroke-width="${K.sw*.6}"/>`,
 plant:(S,K)=>`<path d="M20 60H100L90 130H30Z" fill="${K.c('#EF8A45')}" ${S}/><path d="M60 60C20 40 30 0 50 -10C60 20 62 40 60 60ZM60 60C100 40 96 0 76 -16C66 20 62 40 60 60Z" fill="${K.c('#2FA85A')}" ${S}/>`,
 umbrella:(S,K)=>`<path d="M0 60C0 -10 130 -10 130 60Q112 44 97 60Q81 44 65 60Q49 44 33 60Q17 44 0 60Z" fill="${K.c('#EF4B3B')}" ${S}/><path d="M65 60V120Q65 140 45 140" fill="none" ${S} stroke-width="${K.sw*1.4}"/>`,
 balloon:(S,K)=>`<path d="M60 0C110 0 120 70 60 110C0 70 10 0 60 0Z" fill="${K.c('#F58CB5')}" ${S}/><path d="M52 112L68 112L60 124Z" fill="${K.c('#F58CB5')}" ${S}/><path d="M60 124C40 150 80 170 60 200" fill="none" ${S}/>`,
 envelope:(S,K)=>`<rect width="130" height="88" fill="${K.paper}" ${S}/><path d="M0 0L65 52L130 0M0 88L48 40M130 88L82 40" fill="none" ${S}/>`,
 laptop:(S,K)=>`<path d="M16 0H114V76H16Z" fill="${K.c('#8E96A3')}" ${S}/><rect x="26" y="10" width="78" height="56" fill="${K.c('#7FD6E8')}"/><path d="M0 80H130L120 100H10Z" fill="${K.c('#D4D8DE')}" ${S}/>`
};
function propSvg(p,w,h,K,pos){const f=PROPS[p];if(!f)return'';const S=`stroke="${K.line}" stroke-width="${K.sw}" stroke-linejoin="round" stroke-linecap="round"`,sc=Math.min(h*.0021,w*.0024)*1.5,x=pos==='left'?w*.06:w-w*.06-130*sc,y=h-150*sc-h*.04;return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(3)})">${f(S,K)}</g>`}

export { PROPS, propSvg };

