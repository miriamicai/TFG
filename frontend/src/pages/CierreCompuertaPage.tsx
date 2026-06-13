import { useState, useEffect } from 'react';
import { cerrarCamion, type EventoResponse } from '../lib/api';

type Phase = 'connecting' | 'connected' | 'closing' | 'done' | 'error';

interface Props {
  loteId: string;
  onContinue: () => void;
}

// ── SVG del camión ────────────────────────────────────────────────────────────

function TruckSVG({ doorClosed }: { doorClosed: boolean }) {
  return (
    <svg
      viewBox="0 0 320 150"
      className="w-full max-w-sm mx-auto drop-shadow-lg"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sombra en el suelo */}
      <ellipse cx="165" cy="142" rx="145" ry="7" fill="rgba(0,0,0,0.35)" />

      {/* ── Caja de carga ── */}
      {/* Cuerpo principal */}
      <rect x="36" y="34" width="165" height="71" rx="3" fill="#1a2d12" />
      {/* Nervios horizontales */}
      <line x1="37" y1="57" x2="200" y2="57" stroke="#263d18" strokeWidth="1.5" opacity="0.5" />
      <line x1="37" y1="80" x2="200" y2="80" stroke="#263d18" strokeWidth="1.5" opacity="0.5" />
      {/* Cara frontal de la caja (unión con la cabina) */}
      <rect x="198" y="34" width="4" height="71" fill="#263d18" />

      {/* ── Apertura superior ── */}
      {/* Marco/borde superior de la caja */}
      <rect x="34" y="26" width="169" height="10" rx="2" fill="#263d18" />
      {/* Interior oscuro visible cuando la compuerta está abierta */}
      <rect x="36" y="27" width="165" height="8" fill="#080e05" />

      {/* ── Compuerta superior — desliza desde el lado de la cabina (derecha) hacia atrás ── */}
      <rect
        x="36"
        y="23"
        width="165"
        height="14"
        rx="2"
        fill="#4a7319"
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'right center',
          transition: 'transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: doorClosed ? 'scaleX(1)' : 'scaleX(0.04)',
        }}
      />
      {/* Nervios decorativos de la compuerta (visibles al cerrar) */}
      {doorClosed && (
        <>
          <line x1="80"  y1="24" x2="80"  y2="36" stroke="#3a5b13" strokeWidth="1.2" opacity="0.6" />
          <line x1="120" y1="24" x2="120" y2="36" stroke="#3a5b13" strokeWidth="1.2" opacity="0.6" />
          <line x1="160" y1="24" x2="160" y2="36" stroke="#3a5b13" strokeWidth="1.2" opacity="0.6" />
        </>
      )}
      {/* Pestillo trasero de la compuerta (visible al cerrar) */}
      {doorClosed && (
        <circle cx="43" cy="30" r="3.5" fill="#618929" />
      )}

      {/* ── Cabina ── */}
      <rect x="200" y="42" width="92" height="63" rx="5" fill="#111d09" />
      {/* Techo de la cabina */}
      <path d="M200 42 Q200 28 216 28 L276 28 Q300 26 300 44 L300 42 L200 42 Z" fill="#1e3009" />
      {/* Parabrisas */}
      <rect x="207" y="46" width="58" height="36" rx="3" fill="#0a2e42" opacity="0.85" />
      {/* Reflejo del parabrisas */}
      <line x1="211" y1="49" x2="232" y2="78" stroke="white" strokeWidth="0.8" opacity="0.12" />
      {/* Ventana lateral */}
      <rect x="270" y="51" width="24" height="22" rx="2" fill="#0a2e42" opacity="0.8" />
      {/* Espejo lateral */}
      <rect x="294" y="54" width="10" height="7" rx="2" fill="#2e4810" />
      {/* Faro delantero */}
      <rect x="291" y="88" width="13" height="9" rx="3" fill="#fef9c3" opacity="0.85" />
      {/* Parachoques */}
      <rect x="296" y="96" width="14" height="7" rx="2" fill="#2e4810" />
      {/* Línea de la puerta de la cabina */}
      <line x1="262" y1="42" x2="262" y2="105" stroke="#263d18" strokeWidth="1.5" opacity="0.6" />

      {/* ── Chasis ── */}
      <rect x="20" y="105" width="285" height="5" rx="2" fill="#0d1a0a" />

      {/* ── Alojamientos de ruedas ── */}
      <rect x="54" y="103" width="50" height="9" rx="2" fill="#0d1a0a" />
      <rect x="142" y="103" width="50" height="9" rx="2" fill="#0d1a0a" />
      <rect x="230" y="103" width="50" height="9" rx="2" fill="#0d1a0a" />

      {/* ── Ruedas ── */}
      {[79, 167, 255].map(cx => (
        <g key={cx}>
          <circle cx={cx} cy={116} r={20} fill="#0d1208" />
          <circle cx={cx} cy={116} r={13} fill="#1a2d12" />
          <circle cx={cx} cy={116} r={5}  fill="#4a7319" />
          {/* Tuercas de la rueda */}
          {[0, 72, 144, 216, 288].map(angle => (
            <circle
              key={angle}
              cx={cx + 9 * Math.cos((angle * Math.PI) / 180)}
              cy={116 + 9 * Math.sin((angle * Math.PI) / 180)}
              r={1.5}
              fill="#263d18"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// ── Indicador de estado ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<Phase, string> = {
  connecting: 'Conectando con dispositivo IoT…',
  connected:  'Dispositivo conectado',
  closing:    'Compuerta cerrada — registrando en blockchain…',
  done:       '✓ Evento registrado en blockchain',
  error:      'Error al registrar evento',
};

const STATUS_COLOR: Record<Phase, string> = {
  connecting: 'text-white/50',
  connected:  'text-olive-400',
  closing:    'text-amber-300',
  done:       'text-olive-300',
  error:      'text-red-400',
};

const DOT_COLOR: Record<Phase, string> = {
  connecting: 'bg-white/40 animate-pulse',
  connected:  'bg-olive-400',
  closing:    'bg-amber-400 animate-pulse',
  done:       'bg-olive-400',
  error:      'bg-red-500',
};

// ── CierreCompuertaPage ────────────────────────────────────────────────────────

export default function CierreCompuertaPage({ loteId, onContinue }: Props) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [result, setResult] = useState<EventoResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const doorClosed = phase === 'closing' || phase === 'done' || phase === 'error';

  useEffect(() => {
    // t=2s → conectado
    const t1 = setTimeout(() => setPhase('connected'), 2000);

    // t=4s → cierra puerta + llamada a la API
    const t2 = setTimeout(() => {
      setPhase('closing');
      cerrarCamion(loteId)
        .then(res => {
          setResult(res);
          setPhase('done');
        })
        .catch(err => {
          setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
          setPhase('error');
        });
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loteId]);

  return (
    <div className="min-h-screen bg-olive-900 flex flex-col">

      {/* ── Cabecera / indicador de paso ── */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/8">
        <div className="text-olive-500 text-sm uppercase tracking-widest">
          Lote:&nbsp;<span className="font-mono text-olive-200">{loteId}</span>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2">
          {/* Paso 1 completado */}
          <div className="w-6 h-6 rounded-full border border-olive-500 text-olive-500 text-[11px] font-bold flex items-center justify-center">
            ✓
          </div>
          <div className="w-14 h-px bg-olive-600" />
          {/* Paso 2 activo */}
          <div className="w-6 h-6 rounded-full bg-white text-olive-900 text-[11px] font-bold flex items-center justify-center">
            2
          </div>
        </div>

        <div className="w-32" />
      </header>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-lg animate-fade-in-up text-center">

          <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">
            Paso 2 de 2
          </p>
          <h2 className="font-serif text-5xl font-bold text-white mb-14">
            Cierre de Compuerta
          </h2>

          {/* Camión */}
          <div className="mb-14 px-4">
            <TruckSVG doorClosed={doorClosed} />
          </div>

          {/* Fila de estado */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-300 ${DOT_COLOR[phase]}`} />
            <p className={`text-base font-medium transition-colors duration-300 ${STATUS_COLOR[phase]}`}>
              {STATUS_LABEL[phase]}
            </p>
          </div>

          {/* Hash de transacción */}
          {result?.txHash && phase === 'done' && (
            <div className="animate-scale-in mb-10 bg-white/5 border border-white/10 px-6 py-5 text-left">
              <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-2">
                Transaction Hash
              </p>
              <code className="text-sm text-white/65 font-mono break-all leading-relaxed">
                {result.txHash}
              </code>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="animate-scale-in mb-10 bg-red-950/40 border border-red-800/40 px-6 py-4 text-red-400 text-base">
              {errorMsg}
            </div>
          )}

          {/* Botón continuar — aparece cuando la fase es 'done' o 'error' */}
          {(phase === 'done' || phase === 'error') && (
            <button
              onClick={onContinue}
              className="animate-scale-in w-full max-w-xs mx-auto py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 active:bg-olive-100 transition-colors"
            >
              Continuar al transporte →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
