interface IndiaMapProps {
  highlightedStates: string[];
}

interface StateShape {
  d: string;
  label: string;
  lx: number;
  ly: number;
}

const STATES: Record<string, StateShape> = {
  JK: {
    d: "M168,12 L178,8 L192,12 L200,22 L205,38 L198,52 L188,56 L176,52 L168,42 L162,28 Z",
    label: "J&K", lx: 182, ly: 32,
  },
  HP: {
    d: "M192,50 L208,46 L218,54 L222,66 L214,74 L200,72 L190,64 Z",
    label: "HP", lx: 206, ly: 62,
  },
  PB: {
    d: "M162,56 L178,54 L190,64 L192,76 L182,84 L168,82 L158,72 Z",
    label: "PB", lx: 176, ly: 70,
  },
  HR: {
    d: "M182,76 L200,72 L214,74 L218,86 L212,98 L198,102 L188,96 L180,86 Z",
    label: "HR", lx: 200, ly: 88,
  },
  DL: {
    d: "M198,90 L206,88 L210,94 L206,98 L198,98 Z",
    label: "DL", lx: 204, ly: 94,
  },
  UK: {
    d: "M218,50 L238,44 L252,52 L248,68 L234,74 L220,68 Z",
    label: "UK", lx: 236, ly: 60,
  },
  UP: {
    d: "M212,86 L234,74 L262,72 L296,84 L306,100 L292,120 L260,132 L232,126 L218,112 L208,98 Z",
    label: "UP", lx: 256, ly: 102,
  },
  RJ: {
    d: "M108,82 L158,72 L180,86 L198,102 L206,120 L196,144 L162,158 L126,148 L104,124 L100,100 Z",
    label: "RJ", lx: 148, ly: 118,
  },
  GJ: {
    d: "M52,134 L100,124 L108,142 L118,158 L108,184 L82,196 L56,188 L42,166 L44,146 Z",
    label: "GJ", lx: 78, ly: 164,
  },
  MP: {
    d: "M148,148 L206,120 L250,128 L280,140 L282,166 L260,184 L222,188 L186,184 L152,170 Z",
    label: "MP", lx: 216, ly: 158,
  },
  CT: {
    d: "M270,168 L298,162 L312,178 L306,202 L284,208 L268,196 L262,182 Z",
    label: "CT", lx: 288, ly: 186,
  },
  MH: {
    d: "M68,196 L108,184 L152,170 L186,184 L200,208 L192,234 L168,252 L132,258 L98,244 L72,220 Z",
    label: "MH", lx: 136, ly: 220,
  },
  GA: {
    d: "M92,252 L108,248 L112,262 L102,270 L88,266 Z",
    label: "GA", lx: 100, ly: 260,
  },
  KA: {
    d: "M88,266 L128,256 L162,260 L172,280 L166,308 L142,324 L108,322 L86,302 L78,278 Z",
    label: "KA", lx: 124, ly: 292,
  },
  KL: {
    d: "M108,322 L132,318 L142,340 L136,368 L124,382 L112,378 L104,356 L100,336 Z",
    label: "KL", lx: 118, ly: 352,
  },
  TN: {
    d: "M136,318 L168,308 L194,318 L210,340 L204,372 L180,388 L156,382 L138,362 L130,340 Z",
    label: "TN", lx: 172, ly: 350,
  },
  TG: {
    d: "M162,242 L198,234 L228,244 L236,266 L218,280 L186,278 L168,264 Z",
    label: "TG", lx: 198, ly: 260,
  },
  AP: {
    d: "M166,268 L218,280 L244,294 L252,318 L236,340 L206,348 L182,340 L164,312 L160,288 Z",
    label: "AP", lx: 208, ly: 308,
  },
  OD: {
    d: "M288,198 L318,188 L342,200 L348,226 L332,244 L306,248 L284,234 L278,214 Z",
    label: "OD", lx: 314, ly: 218,
  },
  JH: {
    d: "M290,142 L318,134 L338,148 L336,172 L318,182 L296,178 L282,166 Z",
    label: "JH", lx: 312, ly: 160,
  },
  BR: {
    d: "M290,112 L320,104 L342,118 L338,138 L318,146 L294,142 L282,128 Z",
    label: "BR", lx: 314, ly: 128,
  },
  WB: {
    d: "M332,138 L352,128 L366,142 L368,172 L358,198 L342,208 L332,194 L328,168 L332,150 Z",
    label: "WB", lx: 350, ly: 168,
  },
  SK: {
    d: "M352,108 L368,104 L374,116 L364,122 L354,118 Z",
    label: "SK", lx: 362, ly: 114,
  },
  AS: {
    d: "M374,98 L396,92 L424,88 L440,96 L438,112 L418,118 L392,116 L376,112 Z",
    label: "AS", lx: 408, ly: 104,
  },
  ML: {
    d: "M382,116 L412,114 L420,128 L402,136 L384,130 Z",
    label: "ML", lx: 402, ly: 124,
  },
  AR: {
    d: "M412,78 L436,72 L444,86 L432,92 L416,90 Z",
    label: "AR", lx: 428, ly: 84,
  },
  NL: {
    d: "M432,96 L448,92 L454,106 L444,112 L434,108 Z",
    label: "NL", lx: 444, ly: 102,
  },
  MN: {
    d: "M438,112 L456,108 L462,124 L452,132 L440,126 Z",
    label: "MN", lx: 450, ly: 120,
  },
  MZ: {
    d: "M434,128 L452,132 L456,148 L444,156 L430,148 Z",
    label: "MZ", lx: 444, ly: 142,
  },
  TR: {
    d: "M408,136 L424,132 L428,148 L418,156 L404,150 Z",
    label: "TR", lx: 416, ly: 144,
  },
};

export function IndiaMap({ highlightedStates }: IndiaMapProps) {
  return (
    <div className="relative" data-testid="india-map">
      <svg viewBox="25 0 450 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mapHL" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f36c7" />
            <stop offset="50%" stopColor="#0d8ecf" />
            <stop offset="100%" stopColor="#00b0d7" />
          </linearGradient>
          <filter id="mapGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#0d8ecf" floodOpacity="0.35" />
          </filter>
        </defs>

        {Object.entries(STATES).map(([id, s]) => {
          const active = highlightedStates.includes(id);
          return (
            <g key={id} data-testid={`map-state-${id}`}>
              <path
                d={s.d}
                fill={active ? "url(#mapHL)" : "hsl(var(--muted))"}
                stroke={active ? "#0d8ecf" : "hsl(var(--border))"}
                strokeWidth={active ? 1.5 : 0.7}
                opacity={active ? 1 : 0.55}
                filter={active ? "url(#mapGlow)" : undefined}
                className="transition-all duration-300"
              />
              {s.label && (
                <text
                  x={s.lx} y={s.ly}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="7.5" fontFamily="var(--font-sans)"
                  fontWeight={active ? 700 : 400}
                  fill={active ? "white" : "hsl(var(--muted-foreground))"}
                  opacity={active ? 1 : 0.55}
                  className="pointer-events-none select-none"
                >
                  {s.label}
                </text>
              )}
            </g>
          );
        })}

        <text x="240" y="396" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.5" className="select-none">
          India - Cluster Coverage
        </text>
      </svg>
    </div>
  );
}
