import { useId } from 'react';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './CvdReactor.copy.js';
import styles from './CvdProcess.module.css';

// Illustrative geometry, animated by the parent section's single playhead.
export default function CvdReactor() {
  const id = useId().replace(/:/g, '');
  const c = useCopy(COPY);
  return (
    <svg className={styles.reactor} viewBox="0 0 800 460" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-plasma`}>
          <stop stopColor="#f8eaff" stopOpacity="0.9" />
          <stop offset="0.3" stopColor="#bf9aff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7652bc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x2="0" y2="1">
          <stop stopColor="#bfcbd0" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#8799a5" stopOpacity="0.04" />
          <stop offset="1" stopColor="#bfcbd0" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={`${id}-crystal`} x2="1" y2="1">
          <stop stopColor="#e8fcff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#87b9c7" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <g data-growth-scene="">
      <g data-reactor-shell="" fill="none" stroke="#aebbc3" strokeWidth="1">
        <path d="M245 115 V315 Q400 395 555 315 V115" fill={`url(#${id}-metal)`} />
        <ellipse cx="400" cy="115" rx="155" ry="48" />
        <ellipse cx="400" cy="315" rx="155" ry="48" />
        <ellipse cx="400" cy="115" rx="120" ry="32" opacity="0.4" />
        <path d="M245 190 H160 V125 H105 M555 190 H640 V125 H695 M400 67 V25" />
        <path d="M285 342 V380 M515 342 V380 M270 380 H530" opacity="0.5" />
      </g>
      <g data-energy="" fill="none" stroke="#d4b7ff" strokeWidth="1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} data-energy-stream="" pathLength="1"
            d={`M${320 + i * 40} 135 Q${280 + i * 55} 195 ${350 + i * 25} 255`} />
        ))}
      </g>
      <g data-plasma="">
        <ellipse cx="400" cy="220" rx="162" ry="110" fill={`url(#${id}-plasma)`} />
        <ellipse cx="400" cy="245" rx="100" ry="22" fill="none" stroke="#ddc9ff" strokeOpacity="0.55" />
      </g>
      <g fill="#e0c394">
        {Array.from({ length: 32 }, (_, i) => (
          <circle key={i} data-atom="" cx={320 + (i % 8) * 23} cy={254 - Math.floor(i / 8) * 14} r={i % 3 === 0 ? 2.5 : 1.5} />
        ))}
      </g>
      <ellipse cx="400" cy="310" rx="105" ry="29" fill="#1b2329" stroke="#b7a17a" />
      <path d="M330 300 L400 280 L470 300 L400 322 Z" fill="#c6dae0" fillOpacity="0.3" stroke="#dcecef" />
      <g fill={`url(#${id}-crystal)`} stroke="#d9f5ff" strokeWidth="0.8">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} data-crystal-layer="" d={`M330 ${294 - i * 7} L400 ${274 - i * 7} L470 ${294 - i * 7} L400 ${316 - i * 7} Z`} />
        ))}
      </g>
      <g data-scan="" fill="none" stroke="#e5faff">
        <path d="M305 310 L400 282 L495 310 L400 341 Z" strokeOpacity="0.8" />
        <path d="M305 315 L400 287 L495 315 L400 346 Z" strokeOpacity="0.2" />
      </g>
      <g fill="none" stroke="#c2ac86" strokeOpacity="0.55">
        <path d="M290 300 H190 L165 325 H75 M485 225 H590 L620 250 H725" />
        <circle cx="290" cy="300" r="3" /><circle cx="485" cy="225" r="3" />
      </g>
      </g>
      <g data-finished-stone="" fill={`url(#${id}-crystal)`} stroke="#d9f5ff" strokeWidth="1.2">
        <path d="M305 170 L495 170 L550 235 L400 370 L250 235 Z" />
        <path d="M305 170 L340 235 L400 170 L460 235 L495 170 M250 235 H550 M340 235 L400 370 L460 235 M305 170 L400 370 L495 170" fill="none" />
        <path data-glint="" d="M495 145 V195 M470 170 H520 M481 156 L509 184 M481 184 L509 156" fill="none" stroke="#fff" />
      </g>
      <g className={styles.reactorLabels} fill="#c9b797">
        <text x="75" y="348">{c.seed}</text>
        <text x="620" y="275">{c.plasma}</text>
        <text x="75" y="108">{c.inlet}</text>
        <text x="620" y="108">{c.vacuum}</text>
      </g>
    </svg>
  );
}
