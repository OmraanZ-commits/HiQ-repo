interface IndiaMapProps {
  highlightedStates: string[];
}

const STATE_PATHS: Record<string, { d: string; label: string; cx: number; cy: number }> = {
  JK: { d: "M150,20 L170,15 L185,25 L190,45 L180,55 L165,50 L155,40 Z", label: "J&K", cx: 170, cy: 35 },
  HP: { d: "M185,50 L200,45 L210,55 L205,65 L190,65 L180,55 Z", label: "HP", cx: 195, cy: 57 },
  PB: { d: "M165,55 L185,55 L190,65 L185,78 L170,80 L160,70 Z", label: "PB", cx: 175, cy: 68 },
  HR: { d: "M185,70 L205,65 L215,75 L210,90 L195,95 L185,85 Z", label: "HR", cx: 198, cy: 80 },
  DL: { d: "M195,85 L202,82 L206,88 L200,93 Z", label: "DL", cx: 200, cy: 87 },
  UP: { d: "M210,80 L260,70 L290,90 L280,120 L240,130 L210,115 L205,95 Z", label: "UP", cx: 245, cy: 100 },
  RJ: { d: "M120,80 L185,78 L195,95 L205,115 L190,140 L150,150 L110,130 L105,100 Z", label: "RJ", cx: 150, cy: 112 },
  GJ: { d: "M60,130 L110,130 L120,155 L110,180 L80,190 L50,175 L45,150 Z", label: "GJ", cx: 80, cy: 160 },
  MP: { d: "M150,140 L210,125 L260,135 L270,160 L240,180 L190,180 L150,170 Z", label: "MP", cx: 210, cy: 155 },
  MH: { d: "M80,190 L140,175 L190,180 L200,210 L180,240 L140,250 L100,235 L75,210 Z", label: "MH", cx: 140, cy: 215 },
  CT: { d: "M260,160 L290,155 L300,175 L290,200 L265,195 L255,175 Z", label: "CT", cx: 278, cy: 178 },
  OD: { d: "M280,185 L320,175 L340,195 L330,220 L300,225 L280,210 Z", label: "OD", cx: 310, cy: 200 },
  JH: { d: "M280,140 L310,130 L330,145 L325,170 L300,175 L280,165 Z", label: "JH", cx: 305, cy: 155 },
  BR: { d: "M280,110 L320,105 L335,125 L320,140 L290,140 L275,125 Z", label: "BR", cx: 305, cy: 125 },
  WB: { d: "M320,140 L340,130 L355,150 L350,185 L340,200 L325,190 L320,165 Z", label: "WB", cx: 338, cy: 165 },
  AS: { d: "M360,95 L410,85 L425,95 L420,110 L380,115 L355,110 Z", label: "NE", cx: 390, cy: 100 },
  ML: { d: "M370,115 L400,112 L405,125 L385,130 Z", label: "", cx: 388, cy: 120 },
  MN: { d: "M415,105 L430,100 L435,115 L425,120 Z", label: "", cx: 425, cy: 110 },
  MZ: { d: "M420,120 L435,115 L440,135 L425,140 Z", label: "", cx: 430, cy: 128 },
  NL: { d: "M420,95 L435,90 L440,100 L430,105 Z", label: "", cx: 430, cy: 98 },
  TR: { d: "M400,130 L415,125 L418,140 L405,145 Z", label: "", cx: 408, cy: 135 },
  AR: { d: "M400,80 L425,75 L430,90 L415,95 Z", label: "", cx: 415, cy: 85 },
  SK: { d: "M345,115 L360,110 L365,120 L350,125 Z", label: "", cx: 355, cy: 118 },
  KA: { d: "M100,245 L145,240 L160,260 L150,295 L120,310 L90,290 L85,260 Z", label: "KA", cx: 120, cy: 275 },
  TG: { d: "M160,225 L210,220 L230,240 L215,260 L175,260 L155,245 Z", label: "TG", cx: 190, cy: 242 },
  AP: { d: "M155,255 L220,250 L250,275 L230,310 L190,320 L155,300 L145,275 Z", label: "AP", cx: 195, cy: 285 },
  TN: { d: "M140,305 L185,300 L210,320 L200,360 L170,375 L140,355 L130,330 Z", label: "TN", cx: 168, cy: 340 },
  KL: { d: "M105,315 L130,310 L140,340 L130,370 L115,375 L100,350 Z", label: "KL", cx: 118, cy: 345 },
  GA: { d: "M85,250 L100,245 L105,260 L90,265 Z", label: "GA", cx: 95, cy: 255 },
};

export function IndiaMap({ highlightedStates }: IndiaMapProps) {
  return (
    <div className="relative" data-testid="india-map">
      <svg viewBox="30 5 430 385" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mapHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f36c7" />
            <stop offset="100%" stopColor="#00b0d7" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Object.entries(STATE_PATHS).map(([stateId, state]) => {
          const isHighlighted = highlightedStates.includes(stateId);
          return (
            <g key={stateId}>
              <path
                d={state.d}
                fill={isHighlighted ? "url(#mapHighlight)" : "hsl(var(--muted))"}
                stroke={isHighlighted ? "#0d8ecf" : "hsl(var(--border))"}
                strokeWidth={isHighlighted ? "1.5" : "0.8"}
                opacity={isHighlighted ? 1 : 0.5}
                filter={isHighlighted ? "url(#glow)" : undefined}
                className="transition-all duration-300"
                data-testid={`map-state-${stateId}`}
              />
              {state.label && (
                <text
                  x={state.cx}
                  y={state.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="8"
                  fontWeight={isHighlighted ? "bold" : "normal"}
                  fill={isHighlighted ? "white" : "hsl(var(--muted-foreground))"}
                  opacity={isHighlighted ? 1 : 0.6}
                  className="pointer-events-none select-none"
                >
                  {state.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
