import React from 'react';

export const SvgAesEnvelope: React.FC = () => (
  <svg viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[220px] h-auto">
    <defs>
      <linearGradient id="aesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
      </linearGradient>
      <linearGradient id="glowLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
        <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Background Grid Pattern */}
    <path d="M10 20 H230 M10 50 H230 M10 80 H230" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
    
    {/* Block 1: Plaintext */}
    <rect x="15" y="30" width="50" height="40" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    <text x="40" y="54" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="600">DATA</text>
    
    {/* Arrow 1 */}
    <path d="M70 50 H85" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    
    {/* Block 2: Key & Cipher Core */}
    <rect x="90" y="22" width="60" height="56" rx="12" fill="url(#aesGrad)" stroke="#60a5fa" strokeWidth="1.5" />
    <circle cx="120" cy="44" r="10" stroke="#ffffff" strokeWidth="2" fill="none" />
    <path d="M120 54 V62" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    <text x="120" y="47" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">256</text>
    <text x="120" y="72" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="monospace" fontWeight="bold">GCM</text>
    
    {/* Arrow 2 */}
    <path d="M155 50 H170" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    
    {/* Block 3: Encrypted Ciphertext */}
    <rect x="175" y="30" width="50" height="40" rx="8" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
    <text x="200" y="54" textAnchor="middle" fill="#60a5fa" fontSize="8" fontFamily="monospace" fontWeight="bold">0xAEF4</text>
    
    {/* Scanning Glow Line */}
    <path d="M0 50 Q120 40 240 50" stroke="url(#glowLine)" strokeWidth="2" opacity="0.6" />
  </svg>
);

export const SvgGlobalEdge: React.FC = () => (
  <svg viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[220px] h-auto">
    <defs>
      <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Globe Grid Ellipses */}
    <circle cx="120" cy="50" r="42" fill="url(#globeGlow)" stroke="rgba(56,189,248,0.2)" strokeWidth="1.5" />
    <ellipse cx="120" cy="50" rx="42" ry="18" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
    <ellipse cx="120" cy="50" rx="20" ry="42" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
    <line x1="78" y1="50" x2="162" y2="50" stroke="rgba(56,189,248,0.3)" strokeWidth="1" strokeDasharray="3 3" />

    {/* Radar PoP Nodes */}
    <circle cx="100" cy="40" r="3.5" fill="#38bdf8" />
    <circle cx="100" cy="40" r="7" stroke="#38bdf8" strokeWidth="1" opacity="0.5" className="animate-ping" />

    <circle cx="140" cy="45" r="3.5" fill="#60a5fa" />
    <circle cx="120" cy="62" r="3" fill="#38bdf8" />
    <circle cx="135" cy="32" r="2.5" fill="#93c5fd" />
    <circle cx="95" cy="58" r="2.5" fill="#38bdf8" />

    {/* Connection Web */}
    <path d="M100 40 L140 45 M100 40 L95 58 M140 45 L120 62 M140 45 L135 32" stroke="rgba(56,189,248,0.4)" strokeWidth="1" />
    
    {/* Latency Tag */}
    <rect x="165" y="15" width="60" height="22" rx="6" fill="#0c2340" stroke="#38bdf8" strokeWidth="1" />
    <text x="195" y="30" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">9.4 ms</text>
  </svg>
);

export const SvgTotpDial: React.FC = () => (
  <svg viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[220px] h-auto">
    {/* 30s Countdown Dial Arc */}
    <circle cx="65" cy="50" r="34" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
    <circle cx="65" cy="50" r="34" stroke="#34d399" strokeWidth="6" strokeDasharray="213" strokeDashoffset="55" strokeLinecap="round" fill="none" />
    <text x="65" y="47" textAnchor="middle" fill="#ffffff" fontSize="13" fontFamily="monospace" fontWeight="bold">30s</text>
    <text x="65" y="60" textAnchor="middle" fill="#6ee7b7" fontSize="7" fontFamily="monospace">ROTATE</text>

    {/* Passcode Digits Box */}
    <rect x="120" y="30" width="105" height="40" rx="10" fill="rgba(52,211,153,0.08)" stroke="rgba(52,211,153,0.3)" strokeWidth="1.5" />
    <text x="172" y="55" textAnchor="middle" fill="#34d399" fontSize="16" fontFamily="monospace" fontWeight="bold" letterSpacing="4">849 201</text>
  </svg>
);

export const SvgOprfCurve: React.FC = () => (
  <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[180px] h-auto">
    {/* Coordinate Axes */}
    <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
    <line x1="40" y1="20" x2="40" y2="110" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
    
    {/* Elliptic Curve: y^2 = x^3 - 3x + 3 */}
    <path d="M45 100 C 60 50, 75 35, 100 55 C 130 80, 160 30, 175 25" stroke="#a78bfa" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M45 100 C 60 110, 75 115, 100 95 C 130 70, 160 110, 175 115" stroke="#a78bfa" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" fill="none" />

    {/* Blinded Point P * r */}
    <circle cx="100" cy="55" r="5" fill="#c084fc" />
    <circle cx="100" cy="55" r="10" stroke="#c084fc" strokeWidth="1" opacity="0.6" />
    <text x="115" y="50" fill="#e9d5ff" fontSize="9" fontFamily="monospace" fontWeight="bold">P = r·H(pin)</text>

    {/* Evaluated Point */}
    <circle cx="160" cy="32" r="4" fill="#60a5fa" />
    <text x="145" y="20" fill="#93c5fd" fontSize="8" fontFamily="monospace">P^k (eval)</text>
  </svg>
);

export const SvgRamPurge: React.FC = () => (
  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[180px] h-auto">
    <rect x="25" y="10" width="150" height="45" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    {/* RAM Pins */}
    <line x1="45" y1="55" x2="45" y2="60" stroke="#94a3b8" strokeWidth="2" />
    <line x1="65" y1="55" x2="65" y2="60" stroke="#94a3b8" strokeWidth="2" />
    <line x1="85" y1="55" x2="85" y2="60" stroke="#94a3b8" strokeWidth="2" />
    <line x1="115" y1="55" x2="115" y2="60" stroke="#94a3b8" strokeWidth="2" />
    <line x1="135" y1="55" x2="135" y2="60" stroke="#94a3b8" strokeWidth="2" />
    <line x1="155" y1="55" x2="155" y2="60" stroke="#94a3b8" strokeWidth="2" />
    
    <text x="100" y="32" textAnchor="middle" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="bold">NON-EXTRACTABLE</text>
    <text x="100" y="45" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">CRYPTO_KEY_MEMORY</text>
  </svg>
);

export const SvgKaTeXMermaid: React.FC = () => (
  <svg viewBox="0 0 220 95" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px] h-auto">
    {/* Math Formula Card */}
    <rect x="15" y="10" width="190" height="34" rx="8" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.3)" strokeWidth="1.2" />
    <text x="110" y="32" textAnchor="middle" fill="#fbbf24" fontSize="13" fontFamily="serif" fontStyle="italic">
      ∫ e<tspan dy="-5" fontSize="9">-x²</tspan><tspan dy="5" fontSize="13"> dx = </tspan>√π
    </text>

    {/* Connected Diagram Nodes */}
    <rect x="25" y="55" width="48" height="26" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
    <text x="49" y="71" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">KaTeX</text>

    <path d="M73 68 H100" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />

    <rect x="100" y="55" width="56" height="26" rx="6" fill="#1e293b" stroke="#34d399" strokeWidth="1.2" />
    <text x="128" y="71" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="monospace" fontWeight="bold">Mermaid</text>

    <path d="M156 68 H175" stroke="#34d399" strokeWidth="1.5" />

    <circle cx="185" cy="68" r="8" fill="#3b82f6" />
    <text x="185" y="71" textAnchor="middle" fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">SVG</text>
  </svg>
);

export const SvgVisualTable: React.FC = () => (
  <svg viewBox="0 0 220 95" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px] h-auto">
    {/* Formula Bar */}
    <rect x="15" y="8" width="190" height="22" rx="6" fill="rgba(56,189,248,0.06)" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
    <text x="30" y="23" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">fx</text>
    <text x="45" y="23" fill="#94a3b8" fontSize="8" fontFamily="monospace">=</text>
    <text x="55" y="23" fill="#6ee7b7" fontSize="8" fontFamily="monospace" fontWeight="bold">SUM(B2:B5)</text>

    {/* Table Grid Container */}
    <rect x="15" y="36" width="190" height="50" rx="6" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    {/* Horizontal lines */}
    <line x1="15" y1="52" x2="205" y2="52" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <line x1="15" y1="68" x2="205" y2="68" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    {/* Vertical lines */}
    <line x1="62" y1="36" x2="62" y2="86" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <line x1="110" y1="36" x2="110" y2="86" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <line x1="158" y1="36" x2="158" y2="86" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

    {/* Column Headers */}
    <text x="38" y="47" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace" fontWeight="bold">ITEM</text>
    <text x="86" y="47" textAnchor="middle" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="bold">QTY</text>
    <text x="134" y="47" textAnchor="middle" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="bold">PRICE</text>
    <text x="181" y="47" textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="monospace" fontWeight="bold">TOTAL</text>

    {/* Row 1 */}
    <text x="38" y="62" textAnchor="middle" fill="#e2e8f0" fontSize="7" fontFamily="sans-serif">Cloud Vault</text>
    <text x="86" y="62" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">4</text>
    <text x="134" y="62" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">$12</text>
    <text x="181" y="62" textAnchor="middle" fill="#6ee7b7" fontSize="7" fontFamily="monospace" fontWeight="bold">$48</text>

    {/* Row 2 / Highlighted Total */}
    <rect x="158" y="69" width="46" height="16" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="1" rx="2" />
    <text x="38" y="78" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="sans-serif">Audit Log</text>
    <text x="86" y="78" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">1</text>
    <text x="134" y="78" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">$0</text>
    <text x="181" y="79" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="monospace" fontWeight="bold">∑ $48</text>
  </svg>
);

export const SvgDebounceBuffer: React.FC = () => (
  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[180px] h-auto">
    <rect x="20" y="8" width="160" height="48" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    {/* Oscilloscope Waveform */}
    <path d="M30 32 H65 L75 16 L85 46 L95 24 L105 38 L115 32 H170" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="115" cy="32" r="3" fill="#10b981" />
    <text x="100" y="50" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="monospace">2s STABILIZED</text>
  </svg>
);

export const SvgCommitChain: React.FC = () => (
  <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[220px] h-auto">
    {/* Commit Line */}
    <line x1="30" y1="45" x2="210" y2="45" stroke="#3b82f6" strokeWidth="2.5" />
    
    {/* Commit Node 1 */}
    <circle cx="45" cy="45" r="7" fill="#0e1726" stroke="#60a5fa" strokeWidth="2" />
    <text x="45" y="70" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">e8f1b</text>

    {/* Commit Node 2 */}
    <circle cx="105" cy="45" r="7" fill="#0e1726" stroke="#60a5fa" strokeWidth="2" />
    <text x="105" y="70" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">c394a</text>

    {/* Commit Node 3 (HEAD) */}
    <circle cx="165" cy="45" r="10" fill="#3b82f6" stroke="#ffffff" strokeWidth="2.5" />
    <circle cx="165" cy="45" r="16" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" className="animate-spin" />
    <text x="165" y="72" textAnchor="middle" fill="#60a5fa" fontSize="9" fontFamily="monospace" fontWeight="bold">HEAD (v2.4)</text>
  </svg>
);

export const SvgNonceCircuit: React.FC = () => (
  <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[220px] h-auto">
    {/* Circuit Breaker Pathway */}
    <rect x="25" y="25" width="190" height="42" rx="10" fill="rgba(248,113,113,0.06)" stroke="rgba(248,113,113,0.3)" strokeWidth="1.5" />
    
    {/* Shield */}
    <path d="M50 36 L65 31 L80 36 V48 C80 56 65 62 65 62 C65 62 50 56 50 48 Z" fill="rgba(248,113,113,0.2)" stroke="#f87171" strokeWidth="1.5" />
    <path d="M60 46 L64 50 L71 42" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

    {/* Nonce Code */}
    <text x="145" y="44" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">CHALLENGE NONCE</text>
    <text x="145" y="57" textAnchor="middle" fill="#fca5a5" fontSize="8" fontFamily="monospace">6-BYTE ONE-TIME TOKEN</text>
  </svg>
);

export const SvgTypographyOled: React.FC = () => (
  <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[220px] h-auto">
    <rect x="20" y="20" width="200" height="52" rx="10" fill="#000000" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
    
    <text x="40" y="52" fill="#ffffff" fontSize="24" fontFamily="monospace" fontWeight="900">Aa</text>
    <line x1="80" y1="30" x2="80" y2="62" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    
    <text x="95" y="44" fill="#93c5fd" fontSize="10" fontFamily="monospace" fontWeight="bold">Monaspace Neon</text>
    <text x="95" y="57" fill="#64748b" fontSize="8" fontFamily="sans-serif">Noto Sans / Serif CJK</text>
  </svg>
);
