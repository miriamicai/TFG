import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitarPesaje, type EventoResponse } from '../lib/api';
import { CheckCircle2 } from 'lucide-react';

type WeighPhase = 'requesting' | 'weighing' | 'success' | 'error';

interface Props {
  loteId: string;
}

// ── SVG de la báscula ─────────────────────────────────────────────────────────

function ScaleSVG({ tilted }: { tilted: boolean }) {
  return (
    <svg
      viewBox="0 0 260 175"
      className="w-full max-w-xs mx-auto drop-shadow-lg"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sombra */}
      <ellipse cx="130" cy="167" rx="65" ry="6" fill="rgba(0,0,0,0.3)" />

      {/* Base */}
      <rect x="85" y="148" width="90" height="14" rx="5" fill="#1e3009" />
      <rect x="90" y="145" width="80" height="5" rx="2" fill="#2e4810" />

      {/* Columna */}
      <rect x="126" y="78" width="8" height="70" rx="2" fill="#2e4810" />

      {/* Triángulo del fulcro */}
      <polygon points="114,82 146,82 130,65" fill="#3a5b13" />
      {/* Tapa del pivote del fulcro */}
      <circle cx="130" cy="78" r="6" fill="#4a7319" />
      <circle cx="130" cy="78" r="3" fill="#618929" />

      {/* Aguja / puntero */}
      <line
        x1="130" y1="82"
        x2="130" y2="148"
        stroke="#2e4810"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.4"
      />

      {/* ── Grupo del brazo giratorio ── */}
      <g
        style={{
          transformOrigin: '130px 78px',
          transition: 'transform 1.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: tilted ? 'rotate(13deg)' : 'rotate(0deg)',
        }}
      >
        {/* Brazo de la balanza */}
        <rect x="22" y="74" width="216" height="8" rx="4" fill="#3a5b13" />

        {/* ── Brazo izquierdo ── */}
        <line x1="38"  y1="82" x2="25"  y2="116" stroke="#4a7319" strokeWidth="1.5" />
        <line x1="72"  y1="82" x2="85"  y2="116" stroke="#4a7319" strokeWidth="1.5" />
        <line x1="25"  y1="116" x2="85" y2="116" stroke="#4a7319" strokeWidth="1.5" />
        <rect x="20" y="114" width="70" height="7" rx="3.5" fill="#2e4810" />
        <ellipse cx="55" cy="114" rx="35" ry="4" fill="#3a5b13" />

        {/* ── Brazo derecho ── */}
        <line x1="188" y1="82" x2="175" y2="116" stroke="#4a7319" strokeWidth="1.5" />
        <line x1="222" y1="82" x2="235" y2="116" stroke="#4a7319" strokeWidth="1.5" />
        <line x1="175" y1="116" x2="235" y2="116" stroke="#4a7319" strokeWidth="1.5" />
        <rect x="170" y="114" width="70" height="7" rx="3.5" fill="#2e4810" />
        <ellipse cx="205" cy="114" rx="35" ry="4" fill="#3a5b13" />

        {/* Bloque de peso en el platillo derecho (aparece al inclinar) */}
        {tilted && (
          <>
            <rect x="183" y="96" width="44" height="18" rx="4" fill="#618929" opacity="0.9" />
            <rect x="186" y="92" width="38" height="6" rx="3" fill="#4a7319" opacity="0.7" />
            <line x1="195" y1="99" x2="195" y2="111" stroke="#3a5b13" strokeWidth="1" opacity="0.6" />
            <line x1="205" y1="99" x2="205" y2="111" stroke="#3a5b13" strokeWidth="1" opacity="0.6" />
            <line x1="215" y1="99" x2="215" y2="111" stroke="#3a5b13" strokeWidth="1" opacity="0.6" />
          </>
        )}
      </g>
    </svg>
  );
}

// ── PesajePage ────────────────────────────────────────────────────────────────

export default function PesajePage({ loteId }: Props) {
  const [phase, setPhase]       = useState<WeighPhase>('requesting');
  const [weight, setWeight]     = useState<number | null>(null);
  const [result, setResult]     = useState<EventoResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(false);

  const ejecutarPesaje = useCallback(() => {
    setPhase('requesting');
    setWeight(null);
    setResult(null);
    setErrorMsg(null);

    solicitarPesaje(loteId)
      .then((res) => {
        setResult(res);
        setWeight(res.pesoKg);
        setPhase('weighing');
        timerRef.current = setTimeout(() => setPhase('success'), 2000);
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Error al contactar con la báscula');
        setPhase('error');
      });
  }, [loteId]);

  useEffect(() => {
    if (requestRef.current) return;
    requestRef.current = true;
    ejecutarPesaje();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ejecutarPesaje]);

  function handleRetry() {
    if (timerRef.current) clearTimeout(timerRef.current);
    requestRef.current = false;
    ejecutarPesaje();
  }

  // ── Pantalla de éxito ────────────────────────────────────────────────────────
  if (phase === 'success' && result) {
    return (
      <div className="min-h-screen bg-olive-900 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-md text-center animate-scale-in">

          <CheckCircle2 className="w-14 h-14 text-olive-400 mx-auto mb-8" />

          <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">
            Registro completo
          </p>
          <h2 className="font-serif text-5xl font-bold text-white mb-4">
            Lote Completado
          </h2>
          <p className="text-white/45 text-base mb-12 leading-relaxed">
            Todos los eventos han sido registrados<br />e inmutablemente certificados en blockchain.
          </p>

          <div className="bg-white/5 border border-white/10 px-7 py-7 mb-10 text-left space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-1.5">Lote</p>
              <p className="font-mono font-bold text-white text-xl">{loteId}</p>
            </div>
            <div className="h-px bg-white/8" />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-1.5">
                Peso registrado
              </p>
              <p className="font-serif text-4xl font-bold text-white">
                {weight?.toLocaleString('es-ES')}{' '}
                <span className="text-olive-400 text-2xl font-normal">kg</span>
              </p>
            </div>
            {result.txHash && (
              <>
                <div className="h-px bg-white/8" />
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-1.5">
                    Transaction Hash
                  </p>
                  <code className="text-sm text-white/55 font-mono break-all leading-relaxed">
                    {result.txHash}
                  </code>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ── Pantalla de pesaje / solicitud / error ───────────────────────────────────
  return (
    <div className="min-h-screen bg-olive-900 flex flex-col">

      <header className="px-8 py-5 flex items-center justify-between border-b border-white/8">
        <div className="text-olive-500 text-sm uppercase tracking-widest">
          Lote:&nbsp;<span className="font-mono text-olive-200">{loteId}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-olive-500 text-olive-500 text-[11px] font-bold flex items-center justify-center">✓</div>
          <div className="w-14 h-px bg-olive-600" />
          <div className="w-6 h-6 rounded-full border border-olive-500 text-olive-500 text-[11px] font-bold flex items-center justify-center">✓</div>
          <div className="w-14 h-px bg-olive-600" />
          <div className="w-6 h-6 rounded-full bg-white text-olive-900 text-[11px] font-bold flex items-center justify-center">3</div>
        </div>

        <div className="w-32" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-md animate-fade-in-up text-center">

          <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">
            Paso 3 de 3
          </p>
          <h2 className="font-serif text-5xl font-bold text-white mb-12">
            Pesaje IoT
          </h2>

          <div className="mb-10 px-4">
            <ScaleSVG tilted={phase === 'weighing'} />
          </div>

          {phase === 'weighing' && weight !== null ? (
            <div className="animate-scale-in mb-8">
              <p className="font-serif text-7xl font-bold text-white leading-none mb-2">
                {weight.toLocaleString('es-ES')}
              </p>
              <p className="text-olive-400 text-base uppercase tracking-[0.3em]">kg</p>
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center mb-8">
              <div className="flex items-center gap-3 text-white/40 text-base">
                <span className="w-2 h-2 rounded-full bg-white/30 animate-pulse flex-shrink-0" />
                {phase === 'requesting'
                  ? 'Contactando con báscula IoT…'
                  : 'Procesando…'}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="animate-scale-in mb-6 bg-red-950/40 border border-red-800/40 px-6 py-4 text-red-400 text-base">
              {errorMsg}
            </div>
          )}

          {phase === 'error' && (
            <button
              onClick={handleRetry}
              className="mt-2 w-full py-4 bg-transparent text-white border border-white/25 font-bold text-sm uppercase tracking-widest hover:bg-white/8 transition-colors"
            >
              ↺ Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
