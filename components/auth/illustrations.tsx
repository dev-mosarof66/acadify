/**
 * Decorative illustrations for the auth pages. Drawn for the green gradient panel:
 * white "cards" with soft shadows, template greens and the gold accent used on the hero cap.
 * Floating parts sit in an outer <g> so the CSS float animation doesn't override their SVG transform.
 */

const INK = "#0E1A12";
const GREEN = "#2E8B2E";
const GREEN_SOFT = "#E6F4E0";
const MUTED = "#C9D3CC";

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#0B2E0B" floodOpacity="0.28" />
      </filter>
      <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#57B53A" />
        <stop offset="1" stopColor={GREEN} />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFE07A" />
        <stop offset="1" stopColor="#E29A00" />
      </linearGradient>
      <linearGradient id={`${id}-cap-top`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8EE06A" />
        <stop offset=".55" stopColor="#3DA23A" />
        <stop offset="1" stopColor="#1F6B22" />
      </linearGradient>
      <linearGradient id={`${id}-cap-base`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={GREEN} />
        <stop offset="1" stopColor="#17501A" />
      </linearGradient>
      <pattern id={`${id}-dots`} width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.8" fill="#FFFFFF" fillOpacity="0.45" />
      </pattern>
    </defs>
  );
}

function Halo() {
  return (
    <>
      <circle cx="260" cy="250" r="205" fill="#FFFFFF" fillOpacity="0.07" />
      <circle cx="260" cy="250" r="140" fill="#FFFFFF" fillOpacity="0.07" />
    </>
  );
}

function Check({ x, y, size = 10, color = GREEN, width = 2.6 }: { x: number; y: number; size?: number; color?: string; width?: number }) {
  return (
    <path
      d={`M${x} ${y} l${size * 0.38} ${size * 0.38} l${size * 0.72} -${size * 0.76}`}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function LoginIllustration({ className }: { className?: string }) {
  const id = "li";
  const bars = [40, 62, 48, 80, 66, 98];
  return (
    <svg viewBox="0 0 520 480" className={className} aria-hidden role="presentation" fontFamily="inherit">
      <Defs id={id} />
      <Halo />
      <rect x="18" y="40" width="70" height="56" fill={`url(#${id}-dots)`} />
      <rect x="436" y="230" width="70" height="56" fill={`url(#${id}-dots)`} />

      {/* Monitor with dashboard */}
      <g filter={`url(#${id}-shadow)`}>
        <rect x="95" y="110" width="300" height="200" rx="16" fill={INK} fillOpacity="0.92" />
        <rect x="103" y="118" width="284" height="184" rx="10" fill="#FFFFFF" />
        <rect x="225" y="310" width="40" height="22" fill={INK} fillOpacity="0.85" />
        <rect x="195" y="330" width="100" height="9" rx="4.5" fill={INK} fillOpacity="0.85" />
      </g>
      <g transform="translate(103 118)">
        <rect x="16" y="14" width="64" height="8" rx="4" fill={GREEN_SOFT} />
        <circle cx="252" cy="18" r="5" fill={GREEN_SOFT} />
        <circle cx="266" cy="18" r="5" fill={GREEN} />
        <circle cx="60" cy="88" r="30" fill="none" stroke={GREEN_SOFT} strokeWidth="10" />
        <circle
          cx="60"
          cy="88"
          r="30"
          fill="none"
          stroke={GREEN}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="173 189"
          transform="rotate(-90 60 88)"
        />
        <text x="60" y="93" textAnchor="middle" fontSize="15" fontWeight="800" fill={INK}>
          92%
        </text>
        <rect x="16" y="140" width="80" height="7" rx="3.5" fill={GREEN_SOFT} />
        <rect x="16" y="154" width="54" height="7" rx="3.5" fill={GREEN_SOFT} />
        <line x1="120" y1="158" x2="268" y2="158" stroke={GREEN_SOFT} strokeWidth="2" />
        {bars.map((h, i) => (
          <rect key={i} x={124 + i * 24} y={156 - h} width="16" height={h} rx="4" fill={`url(#${id}-bar)`} />
        ))}
      </g>

      {/* Graduation cap */}
      <g className="animate-float">
        <g transform="translate(316 18) scale(0.82)" filter={`url(#${id}-shadow)`}>
          <path d="M52 92v40c0 18 30 30 58 30s58-12 58-30V92l-58 26z" fill={`url(#${id}-cap-base)`} />
          <path d="M110 30 8 78l102 48 102-48z" fill={`url(#${id}-cap-top)`} />
          <path d="M110 30 8 78l102 48 102-48z" fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="1.5" />
          <ellipse cx="110" cy="78" rx="10" ry="5" fill="#17501A" />
          <path d="M110 78 186 92v44" stroke={`url(#${id}-gold)`} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M180 134h12l4 26h-20z" fill={`url(#${id}-gold)`} />
        </g>
      </g>

      {/* SMS delivered card */}
      <g className="animate-float [animation-delay:0.6s] [animation-duration:7s]">
        <g transform="translate(22 262)" filter={`url(#${id}-shadow)`}>
          <rect width="176" height="78" rx="16" fill="#FFFFFF" />
          <circle cx="30" cy="30" r="16" fill={GREEN_SOFT} />
          <path d="M22 24h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-9l-5 4v-4h-2a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z" fill={GREEN} />
          <rect x="54" y="20" width="96" height="9" rx="4.5" fill={INK} fillOpacity="0.85" />
          <rect x="54" y="36" width="108" height="7" rx="3.5" fill={MUTED} />
          <rect x="16" y="54" width="74" height="16" rx="8" fill={GREEN_SOFT} />
          <Check x={26} y={62} size={8} width={2.2} />
          <rect x="42" y="59" width="38" height="6" rx="3" fill={GREEN} fillOpacity="0.6" />
        </g>
      </g>

      {/* Fees card */}
      <g className="animate-float [animation-delay:1.2s] [animation-duration:8s]">
        <g transform="translate(318 316)" filter={`url(#${id}-shadow)`}>
          <rect width="182" height="104" rx="16" fill="#FFFFFF" />
          <rect x="16" y="16" width="66" height="7" rx="3.5" fill={MUTED} />
          <text x="16" y="50" fontSize="21" fontWeight="800" fill={INK}>
            ৳4,82,300
          </text>
          <rect x="128" y="35" width="40" height="18" rx="9" fill={GREEN_SOFT} />
          <text x="148" y="48" textAnchor="middle" fontSize="10" fontWeight="800" fill={GREEN}>
            +18%
          </text>
          <path d="M16 90 L42 82 L66 85 L92 72 L118 75 L142 62 L166 58" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="166" cy="58" r="4" fill="#FFFFFF" stroke={GREEN} strokeWidth="2.5" />
        </g>
      </g>
    </svg>
  );
}

export function ForgotIllustration({ className }: { className?: string }) {
  const id = "fi";
  const code = ["4", "8", "2", "9", "1", "6"];
  return (
    <svg viewBox="0 0 520 480" className={className} aria-hidden role="presentation" fontFamily="inherit">
      <Defs id={id} />
      <Halo />
      <rect x="430" y="40" width="70" height="56" fill={`url(#${id}-dots)`} />
      <rect x="20" y="360" width="70" height="56" fill={`url(#${id}-dots)`} />

      {/* Phone receiving the code */}
      <g filter={`url(#${id}-shadow)`}>
        <rect x="78" y="62" width="184" height="350" rx="30" fill={INK} fillOpacity="0.92" />
        <rect x="88" y="72" width="164" height="330" rx="22" fill="#FFFFFF" />
      </g>
      <g transform="translate(88 72)">
        <rect x="57" y="10" width="50" height="9" rx="4.5" fill={INK} fillOpacity="0.9" />
        <circle cx="30" cy="48" r="13" fill={GREEN_SOFT} />
        <path d="M24 44h12M24 49h8" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" />
        <rect x="50" y="42" width="70" height="7" rx="3.5" fill={INK} fillOpacity="0.8" />
        <rect x="50" y="53" width="44" height="6" rx="3" fill={MUTED} />
        <rect x="16" y="78" width="132" height="58" rx="14" fill={GREEN_SOFT} />
        <rect x="28" y="92" width="100" height="7" rx="3.5" fill={GREEN} fillOpacity="0.55" />
        <rect x="28" y="106" width="78" height="7" rx="3.5" fill={GREEN} fillOpacity="0.35" />
        <rect x="28" y="120" width="54" height="7" rx="3.5" fill={GREEN} fillOpacity="0.35" />
        {code.map((d, i) => (
          <g key={i}>
            <rect x={16 + i * 22.4} y="158" width="18" height="28" rx="6" fill="#FFFFFF" stroke={GREEN} strokeWidth="2" />
            <text x={25 + i * 22.4} y="177" textAnchor="middle" fontSize="13" fontWeight="800" fill={INK}>
              {d}
            </text>
          </g>
        ))}
        <rect x="16" y="208" width="132" height="34" rx="17" fill={GREEN} />
        <Check x={74} y={225} size={12} color="#FFFFFF" width={3} />
        <rect x="40" y="262" width="84" height="6" rx="3" fill={MUTED} />
        <rect x="56" y="300" width="52" height="6" rx="3" fill={INK} fillOpacity="0.85" />
      </g>

      {/* Padlock */}
      <g className="animate-float">
        <g transform="translate(286 132)" filter={`url(#${id}-shadow)`}>
          <path d="M42 92V62a48 48 0 0 1 96 0v30" fill="none" stroke="#FFFFFF" strokeWidth="20" strokeLinecap="round" />
          <rect x="12" y="84" width="156" height="128" rx="26" fill={`url(#${id}-gold)`} />
          <rect x="12" y="84" width="156" height="128" rx="26" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2" />
          <circle cx="90" cy="138" r="16" fill="#7A4E00" fillOpacity="0.55" />
          <rect x="84" y="144" width="12" height="32" rx="6" fill="#7A4E00" fillOpacity="0.55" />
        </g>
      </g>

      {/* Key */}
      <g className="animate-float [animation-delay:0.8s] [animation-duration:7s]">
        <g transform="translate(408 70) rotate(35)" filter={`url(#${id}-shadow)`}>
          <circle cx="0" cy="0" r="22" fill="none" stroke="#FFFFFF" strokeWidth="11" />
          <rect x="18" y="-5.5" width="66" height="11" rx="5.5" fill="#FFFFFF" />
          <rect x="62" y="0" width="10" height="20" rx="3" fill="#FFFFFF" />
          <rect x="76" y="0" width="8" height="14" rx="3" fill="#FFFFFF" />
        </g>
      </g>

      {/* Shield with check */}
      <g className="animate-float [animation-delay:1.4s] [animation-duration:8s]">
        <g transform="translate(330 330)" filter={`url(#${id}-shadow)`}>
          <path d="M60 0 112 18v40c0 34-24 58-52 70C32 116 8 92 8 58V18z" fill="#FFFFFF" />
          <path d="M60 14 98 27v31c0 25-17 43-38 52-21-9-38-27-38-52V27z" fill={GREEN_SOFT} />
          <Check x={42} y={62} size={30} width={7} />
        </g>
      </g>
    </svg>
  );
}
