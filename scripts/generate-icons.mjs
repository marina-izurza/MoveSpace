import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';

const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="s" cx="33%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#CAC3FF"/>
      <stop offset="38%" stop-color="#8E80FB"/>
      <stop offset="72%" stop-color="#5B4DD4"/>
      <stop offset="100%" stop-color="#352AA0"/>
    </radialGradient>
    <radialGradient id="h" cx="30%" cy="22%" r="78%">
      <stop offset="0%" stop-color="#BCB6FF"/>
      <stop offset="100%" stop-color="#5042C2"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="#100F1E"/>
  <g transform="translate(16.7,10) scale(0.667)">
    <rect x="30" y="5" width="40" height="14" rx="7" fill="url(#h)"/>
    <circle cx="50" cy="74" r="42" fill="url(#s)"/>
    <polygon points="36,61 36,87 70,74" fill="white" stroke="white" stroke-width="8"
             stroke-linejoin="round" paint-order="stroke fill" opacity="0.95"/>
  </g>
</svg>`;

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, { width: size, height: size });
  const png = resvg.render().asPng();
  fs.writeFileSync(`public/icons/icon-${size}.png`, png);
  console.log(`✓ icon-${size}.png`);
}
