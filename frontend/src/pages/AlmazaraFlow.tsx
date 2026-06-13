import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  solicitarPesajeCamionLleno,
  registrarVolcadoTolva,
  solicitarPesajeCamionVacio,
  solicitarLavado,
  solicitarPesajeCinta,
  solicitarMolienda,
  solicitarTemperaturaBatido,
  solicitarDecanter,
  solicitarCentrifugadora,
  solicitarExtraccion,
  type EventoResponse,
} from '../lib/api';

// ── Definiciones de estaciones ───────────────────────────────────────────────

interface Station {
  icon: string;
  label: string;
}

const STATIONS: Station[] = [
  { icon: '⚖️', label: 'Pesaje Camión Lleno' },
  { icon: '🚛', label: 'Volcado en Tolva' },
  { icon: '⚖️', label: 'Pesaje Camión Vacío' },
  { icon: '📊', label: 'Peso Neto Aceituna' },
  { icon: '💧', label: 'Lavado' },
  { icon: '🏭', label: 'Pesaje en Cinta' },
  { icon: '⚙️', label: 'Molienda' },
  { icon: '🌡️', label: 'Temperatura Batido' },
  { icon: '🔬', label: 'Decanter' },
  { icon: '🔄', label: 'Centrifugadora' },
  { icon: '🫒', label: 'Extracción Final' },
];

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TxEntry {
  label: string;
  txHash: string | null;
}

type StationState = 'pending' | 'active' | 'completed';
type IotPhase = 'connecting' | 'receiving' | 'confirmed' | 'error';

// ── Diagrama de proceso ───────────────────────────────────────────────────────

interface DiagramProps {
  currentStep: number;
  txHashes: TxEntry[];
}

function ProcessDiagram({ currentStep, txHashes }: DiagramProps) {
  function getState(index: number): StationState {
    const step = index + 1;
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  }

  return (
    <div className="px-6 py-10 overflow-y-auto">
      <p className="text-[10px] uppercase tracking-[0.35em] text-olive-500 mb-8">
        Proceso de extracción
      </p>

      {STATIONS.map((station, i) => {
        const state = getState(i);
        const isLast = i === STATIONS.length - 1;
        const txEntry: TxEntry | null = txHashes[i] ?? null;

        return (
          <div key={i} className="flex items-start gap-4">

            {/* ── Columna de círculo + línea de conexión ── */}
            <div className="flex flex-col items-center flex-shrink-0">

              {/* Círculo de estación */}
              <div
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0',
                  'transition-all duration-500',
                  state === 'completed'
                    ? 'bg-green-600'
                    : state === 'active'
                    ? 'bg-olive-600 animate-pulse'
                    : 'bg-white/5 border border-white/15',
                ].join(' ')}
                style={
                  state === 'active'
                    ? { boxShadow: '0 0 14px rgba(97,137,41,0.55)' }
                    : undefined
                }
              >
                {state === 'completed' ? (
                  <span className="text-white text-sm font-bold leading-none">✓</span>
                ) : (
                  <span className="leading-none">{station.icon}</span>
                )}
              </div>

              {/* Línea de conexión con la siguiente estación */}
              {!isLast && (
                <div
                  className="w-0.5 flex-1 min-h-[28px] mt-1"
                  style={{
                    backgroundColor:
                      state === 'completed'
                        ? '#16a34a'
                        : 'rgba(255,255,255,0.08)',
                    transition: 'background-color 0.8s ease',
                  }}
                />
              )}
            </div>

            {/* ── Etiqueta + txHash ── */}
            <div className={`min-w-0 pt-1.5 ${isLast ? 'pb-0' : 'pb-6'}`}>
              <p
                className={[
                  'text-sm leading-tight transition-colors duration-300',
                  state === 'completed'
                    ? 'text-green-400 font-semibold'
                    : state === 'active'
                    ? 'text-white font-bold'
                    : 'text-white/25 font-medium',
                ].join(' ')}
              >
                {station.label}
              </p>

              {state === 'active' && (
                <p className="text-[10px] text-olive-400 mt-0.5 uppercase tracking-[0.15em]">
                  en curso →
                </p>
              )}

              {state === 'completed' && txEntry !== null && (
                <p className="font-mono text-[10px] text-white/20 mt-0.5 truncate max-w-[160px]">
                  {txEntry.txHash
                    ? `${txEntry.txHash.slice(0, 10)}…${txEntry.txHash.slice(-6)}`
                    : 'sin hash'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-[10px] uppercase tracking-widest text-olive-500 hover:text-olive-300 transition-colors flex-shrink-0"
    >
      {copied ? '✓' : 'Copiar'}
    </button>
  );
}

function StepSuccessCard({ txHash, onAdvance }: { txHash: string | null; onAdvance?: () => void }) {
  return (
    <div className="animate-scale-in bg-white/5 border border-white/10 px-6 py-5 text-left">
      <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-2">
        Registrado en blockchain
      </p>
      {txHash
        ? <code className="text-sm text-white/55 font-mono break-all leading-relaxed">{txHash}</code>
        : <p className="text-sm text-white/35">Sin hash de transacción</p>}
      {onAdvance && (
        <button
          onClick={onAdvance}
          className="mt-4 w-full py-3 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 active:bg-olive-100 transition-colors"
        >
          Continuar →
        </button>
      )}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="animate-scale-in mb-6 bg-red-950/40 border border-red-800/40 px-5 py-4">
      <p className="text-red-400 text-sm mb-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-400/70 uppercase tracking-widest hover:text-red-300 transition-colors"
        >
          ↺ Reintentar
        </button>
      )}
    </div>
  );
}

const BTN_CLS =
  'w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] ' +
  'hover:bg-olive-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors';

// ── IoT shared components ─────────────────────────────────────────────────────

function IotConnecting() {
  return (
    <div className="flex items-center gap-3 text-white/40 text-base mb-10">
      <span className="w-2 h-2 rounded-full bg-olive-500 animate-pulse flex-shrink-0" />
      Conectando con sensor IoT…
    </div>
  );
}

function IotReceiving() {
  return (
    <div className="flex items-center gap-3 text-white/40 text-base mb-10">
      <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Recibiendo datos del sensor…
    </div>
  );
}

// ── IoT hook ──────────────────────────────────────────────────────────────────

function useIotFlow(
  callFn: () => Promise<EventoResponse>,
  onSuccess: (entry: TxEntry) => void,
  label: string,
) {
  const [phase, setPhase]       = useState<IotPhase>('connecting');
  const [evento, setEvento]     = useState<EventoResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestRef      = useRef(false);
  const pendingEntry    = useRef<TxEntry | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function execute() {
    requestRef.current = true;
    pendingEntry.current = null;
    setPhase('connecting');
    setEvento(null);
    setErrorMsg(null);

    connectTimerRef.current = setTimeout(() => setPhase('receiving'), 600);

    callFn()
      .then(res => {
        if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
        setEvento(res);
        setPhase('confirmed');
        pendingEntry.current = { label, txHash: res.txHash };
      })
      .catch((err: unknown) => {
        if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
        setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
        setPhase('error');
      });
  }

  useEffect(() => {
    if (requestRef.current) return;
    execute();
    return () => {
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function advance() {
    if (pendingEntry.current) {
      onSuccess(pendingEntry.current);
    }
  }

  function handleRetry() {
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    requestRef.current = false;
    execute();
  }

  return { phase, evento, errorMsg, handleRetry, advance };
}

// ── IoT step props ────────────────────────────────────────────────────────────

interface IotStepProps {
  loteId: string;
  almazaraId: string;
  onSuccess: (entry: TxEntry) => void;
}

// ── SVG animations ────────────────────────────────────────────────────────────

function ScaleSVG({ peso, label }: { peso: number | null; label: string }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Base de la plataforma */}
      <rect x="30" y="95" width="140" height="12" rx="3" fill="#3a5b13" />
      <rect x="20" y="107" width="160" height="6" rx="2" fill="#2e4810" />
      {/* Plataforma de la báscula */}
      <rect x="40" y="75" width="120" height="22" rx="4" fill="#4a7c16" opacity="0.9" />
      {/* Camión en báscula (simplificado) */}
      <rect x="55" y="45" width="70" height="32" rx="3" fill="#263d0f" />
      <rect x="55" y="45" width="50" height="32" rx="3" fill="#2e4810" />
      <rect x="105" y="52" width="28" height="25" rx="3" fill="#3a5b13" />
      <rect x="109" y="55" width="18" height="13" rx="2" fill="#1a2e08" />
      <circle cx="72"  cy="78" r="7" fill="#1a2e08" />
      <circle cx="72"  cy="78" r="4" fill="#2e4810" />
      <circle cx="118" cy="78" r="7" fill="#1a2e08" />
      <circle cx="118" cy="78" r="4" fill="#2e4810" />
      {/* Display de peso */}
      <rect x="65" y="10" width="70" height="28" rx="4" fill="#1e3009" />
      {peso !== null ? (
        <text x="100" y="29" textAnchor="middle" fill="#86efac" fontSize="13" fontFamily="monospace" fontWeight="bold">
          {peso.toLocaleString('es-ES')} kg
        </text>
      ) : (
        <text x="100" y="29" textAnchor="middle" fill="#4a7c16" fontSize="11" fontFamily="monospace">
          {label}
        </text>
      )}
    </svg>
  );
}

function CompuertaVolcadoSVG({ phase }: { phase: 'idle' | 'tilting' | 'done' }) {
  const gateOpen = phase !== 'idle';

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Sombra en el suelo */}
      <ellipse cx="170" cy="172" rx="142" ry="6" fill="rgba(0,0,0,0.3)" />

      {/* === Tolva bajo la parte trasera del camión === */}
      <polygon points="28,148 88,148 72,178 44,178" fill="#263d0f" />
      <rect x="28" y="128" width="60" height="22" rx="2" fill="#3a5b13" />
      {/* Aceitunas en la tolva al finalizar */}
      {phase === 'done' && (
        <>
          <ellipse cx="50" cy="160" rx="7" ry="4" fill="#4a7c16" opacity="0.85" />
          <ellipse cx="64" cy="165" rx="6" ry="4" fill="#3d6b12" opacity="0.80" />
          <ellipse cx="50" cy="170" rx="5" ry="3" fill="#4a7c16" opacity="0.75" />
        </>
      )}

      {/* === Caja de carga === */}
      <rect x="40" y="40" width="165" height="88" rx="3" fill="#1a2d12" />
      {/* Nervios horizontales */}
      <line x1="42" y1="65" x2="204" y2="65" stroke="#263d18" strokeWidth="1.5" opacity="0.5" />
      <line x1="42" y1="95" x2="204" y2="95" stroke="#263d18" strokeWidth="1.5" opacity="0.5" />
      {/* Marco superior */}
      <rect x="38" y="32" width="168" height="10" rx="2" fill="#263d18" />

      {/* === Compuerta trasera — sube mediante scaleY === */}
      <rect
        x="32"
        y="40"
        width="10"
        height="88"
        rx="1"
        fill="#4a7319"
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'center top',
          transition: 'transform 1.2s cubic-bezier(0.34,1.56,0.64,1)',
          transform: gateOpen ? 'scaleY(0)' : 'scaleY(1)',
        }}
      />

      {/* === Aceitunas cayendo al abrir la compuerta === */}
      {gateOpen && (
        <>
          <ellipse cx="44" cy="135" rx="7" ry="5" fill="#4a7c16" opacity="0.90" />
          <ellipse cx="56" cy="146" rx="6" ry="4" fill="#3d6b12" opacity="0.85" />
          <ellipse cx="38" cy="153" rx="5" ry="4" fill="#4a7c16" opacity="0.70" />
          <ellipse cx="66" cy="156" rx="7" ry="5" fill="#3d6b12" opacity="0.88" />
          <ellipse cx="48" cy="163" rx="5" ry="3" fill="#4a7c16" opacity="0.75" />
          <ellipse cx="62" cy="168" rx="6" ry="4" fill="#3d6b12" opacity="0.80" />
        </>
      )}

      {/* === Cabina === */}
      <rect x="205" y="50" width="85" height="78" rx="5" fill="#111d09" />
      <path d="M205 50 Q205 34 220 34 L270 34 Q295 32 295 52 L295 50 L205 50 Z" fill="#1e3009" />
      <rect x="212" y="55" width="50" height="34" rx="3" fill="#0a2e42" opacity="0.85" />
      <line x1="215" y1="58" x2="232" y2="85" stroke="white" strokeWidth="0.8" opacity="0.12" />
      <rect x="266" y="59" width="20" height="19" rx="2" fill="#0a2e42" opacity="0.8" />
      <rect x="280" y="100" width="13" height="9" rx="3" fill="#fef9c3" opacity="0.85" />

      {/* === Chasis === */}
      <rect x="24" y="126" width="270" height="5" rx="2" fill="#0d1a0a" />

      {/* === Alojamientos de ruedas === */}
      <rect x="52" y="124" width="46" height="8" rx="2" fill="#0d1a0a" />
      <rect x="140" y="124" width="46" height="8" rx="2" fill="#0d1a0a" />
      <rect x="228" y="124" width="46" height="8" rx="2" fill="#0d1a0a" />

      {/* === Ruedas === */}
      {[75, 163, 251].map(cx => (
        <g key={cx}>
          <circle cx={cx} cy={140} r={17} fill="#0d1208" />
          <circle cx={cx} cy={140} r={11} fill="#1a2d12" />
          <circle cx={cx} cy={140} r={4} fill="#4a7319" />
          {[0, 72, 144, 216, 288].map(angle => (
            <circle
              key={angle}
              cx={cx + 7.5 * Math.cos((angle * Math.PI) / 180)}
              cy={140 + 7.5 * Math.sin((angle * Math.PI) / 180)}
              r={1.5}
              fill="#263d18"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function ConveyorSVG({ peso }: { peso: number | null }) {
  return (
    <svg viewBox="0 0 220 100" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Cinta */}
      <rect x="20" y="55" width="180" height="18" rx="4" fill="#2e4810" />
      <rect x="20" y="55" width="180" height="10" rx="4" fill="#3a5b13" opacity="0.7" />
      {/* Patrón de la cinta */}
      {[40,65,90,115,140,165].map(x => (
        <line key={x} x1={x} y1="55" x2={x} y2="73" stroke="#1e3009" strokeWidth="2" opacity="0.5" />
      ))}
      {/* Rodillos */}
      <circle cx="20"  cy="64" r="10" fill="#263d0f" />
      <circle cx="200" cy="64" r="10" fill="#263d0f" />
      {/* Aceitunas en la cinta */}
      <ellipse cx="70"  cy="50" rx="9" ry="6" fill="#4a7c16" opacity="0.9" />
      <ellipse cx="100" cy="48" rx="8" ry="6" fill="#3d6b12" opacity="0.85" />
      <ellipse cx="130" cy="50" rx="9" ry="6" fill="#4a7c16" opacity="0.9" />
      <ellipse cx="155" cy="49" rx="7" ry="5" fill="#3d6b12" opacity="0.8" />
      {/* Display de peso */}
      {peso !== null && (
        <>
          <rect x="65" y="5" width="90" height="26" rx="4" fill="#1e3009" />
          <text x="110" y="23" textAnchor="middle" fill="#86efac" fontSize="13" fontFamily="monospace" fontWeight="bold">
            {peso.toLocaleString('es-ES')} kg
          </text>
        </>
      )}
    </svg>
  );
}

function WashingSVG() {
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Depósito */}
      <rect x="30" y="50" width="140" height="60" rx="6" fill="#1e3009" />
      <rect x="34" y="54" width="132" height="52" rx="4" fill="#263d0f" />
      {/* Agua */}
      <rect x="34" y="80" width="132" height="26" rx="3" fill="#1d4ed8" opacity="0.4" />
      {/* Aceitunas en el agua */}
      <ellipse cx="75"  cy="78" rx="9" ry="6" fill="#4a7c16" opacity="0.85" />
      <ellipse cx="100" cy="75" rx="8" ry="5" fill="#3d6b12" opacity="0.85" />
      <ellipse cx="125" cy="78" rx="9" ry="6" fill="#4a7c16" opacity="0.85" />
      {/* Arcos de aspersión */}
      <path d="M 50 50 Q 60 20 70 50" fill="none" stroke="#60a5fa" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
      <path d="M 90 50 Q 100 15 110 50" fill="none" stroke="#60a5fa" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
      <path d="M 130 50 Q 140 20 150 50" fill="none" stroke="#60a5fa" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
      {/* Gotas */}
      <circle cx="65"  cy="22" r="3" fill="#60a5fa" opacity="0.6" />
      <circle cx="100" cy="15" r="3" fill="#60a5fa" opacity="0.6" />
      <circle cx="145" cy="22" r="3" fill="#60a5fa" opacity="0.6" />
    </svg>
  );
}

function MillSVG({ temperaturaC }: { temperaturaC: number }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Muela */}
      <circle cx="100" cy="70" r="42" fill="#2e4810" />
      <circle cx="100" cy="70" r="35" fill="#3a5b13" />
      <circle cx="100" cy="70" r="10" fill="#263d0f" />
      {/* Ranuras del molino */}
      {[0,45,90,135].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 100 + 12 * Math.cos(rad);
        const y1 = 70  + 12 * Math.sin(rad);
        const x2 = 100 + 33 * Math.cos(rad);
        const y2 = 70  + 33 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e3009" strokeWidth="3" />;
      })}
      {/* Display de temperatura */}
      {temperaturaC > 0 && (
        <>
          <rect x="55" y="5" width="90" height="26" rx="4" fill="#1e3009" />
          <text x="100" y="23" textAnchor="middle" fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">
            {(temperaturaC / 10).toFixed(1)} °C
          </text>
        </>
      )}
    </svg>
  );
}

function BatidoSVG({ temperaturaC }: { temperaturaC: number }) {
  const overLimit = temperaturaC > 270;
  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Depósito */}
      <rect x="35" y="40" width="130" height="80" rx="8" fill="#1e3009" />
      <rect x="39" y="44" width="122" height="72" rx="6" fill="#263d0f" />
      {/* Líquido / onda */}
      <path d="M 39 90 Q 60 82 80 90 Q 100 98 120 90 Q 140 82 161 90 L 161 116 Q 140 116 120 116 Q 100 116 80 116 Q 60 116 39 116 Z"
        fill={overLimit ? '#991b1b' : '#3d6b12'} opacity="0.7" />
      {/* Indicador de temperatura */}
      {temperaturaC > 0 && (
        <>
          <rect x="55" y="5" width="90" height="26" rx="4" fill="#1e3009" />
          <text x="100" y="23" textAnchor="middle"
            fill={overLimit ? '#f87171' : '#86efac'}
            fontSize="13" fontFamily="monospace" fontWeight="bold">
            {(temperaturaC / 10).toFixed(1)} °C
          </text>
        </>
      )}
    </svg>
  );
}

function DecanterSVG({ litros, alpeorujo }: { litros: number; alpeorujo: number }) {
  return (
    <svg viewBox="0 0 220 120" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Cuerpo cilíndrico */}
      <rect x="20" y="45" width="180" height="55" rx="28" fill="#2e4810" />
      <rect x="25" y="50" width="170" height="45" rx="22" fill="#3a5b13" />
      {/* Capas de líquido: aceite (superior) + agua + sólidos */}
      <rect x="25" y="50" width="170" height="14" rx="0" fill="#ca8a04" opacity="0.55" />
      <rect x="25" y="64" width="170" height="10" rx="0" fill="#1d4ed8" opacity="0.30" />
      <rect x="25" y="74" width="170" height="21" rx="22" fill="#1e3009" opacity="0.60" />
      {/* Tapas */}
      <ellipse cx="20"  cy="72" rx="12" ry="27" fill="#263d0f" />
      <ellipse cx="200" cy="72" rx="12" ry="27" fill="#263d0f" />
      {/* Etiquetas de datos */}
      {litros > 0 && (
        <text x="110" y="30" textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="monospace">
          {litros}L aceite · {alpeorujo}kg alpeorujo
        </text>
      )}
    </svg>
  );
}

function CentrifugadoraSVG({ rpm, temp }: { rpm: number; temp: number }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Tambor exterior */}
      <circle cx="100" cy="80" r="46" fill="#2e4810" />
      <circle cx="100" cy="80" r="38" fill="#3a5b13" />
      {/* Anillos interiores giratorios */}
      <circle cx="100" cy="80" r="26" fill="none" stroke="#4a7c16" strokeWidth="4" strokeDasharray="8 4" />
      <circle cx="100" cy="80" r="14" fill="#263d0f" />
      <circle cx="100" cy="80" r="6"  fill="#4a7c16" opacity="0.8" />
      {/* Display RPM / Temperatura */}
      {rpm > 0 && (
        <>
          <rect x="50" y="5" width="100" height="26" rx="4" fill="#1e3009" />
          <text x="100" y="23" textAnchor="middle" fill="#c084fc" fontSize="12" fontFamily="monospace" fontWeight="bold">
            {rpm} rpm · {(temp / 10).toFixed(1)}°C
          </text>
        </>
      )}
    </svg>
  );
}

function OilDropsSVG({ litros, rendimiento }: { litros: number; rendimiento: number }) {
  return (
    <svg viewBox="0 0 220 130" className="w-full max-w-xs mx-auto mb-6" xmlns="http://www.w3.org/2000/svg">
      {/* Botella de aceite */}
      <rect x="90" y="50" width="40" height="70" rx="5" fill="#ca8a04" opacity="0.85" />
      <rect x="95" y="40" width="30" height="14" rx="3" fill="#a16207" />
      <rect x="99" y="32" width="22" height="10" rx="3" fill="#78350f" />
      {/* Gotas */}
      <ellipse cx="50"  cy="65" rx="12" ry="18" fill="#ca8a04" opacity="0.6" />
      <ellipse cx="170" cy="70" rx="10" ry="15" fill="#ca8a04" opacity="0.6" />
      <ellipse cx="35"  cy="95" rx="8"  ry="12" fill="#ca8a04" opacity="0.45" />
      <ellipse cx="185" cy="95" rx="8"  ry="12" fill="#ca8a04" opacity="0.45" />
      {/* Estadísticas */}
      {litros > 0 && (
        <text x="110" y="25" textAnchor="middle" fill="#fbbf24" fontSize="12" fontFamily="monospace" fontWeight="bold">
          {litros}L · {(rendimiento / 10).toFixed(1)}%
        </text>
      )}
    </svg>
  );
}

// ── Step 1: Pesaje Camión Lleno (IoT) ─────────────────────────────────────────

function Step1IoT({ loteId, almazaraId, onSuccess, onPesoLleno }: IotStepProps & { onPesoLleno: (kg: number) => void }) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarPesajeCamionLleno(loteId, almazaraId),
    onSuccess,
    'Pesaje Camión Lleno',
  );

  useEffect(() => {
    if (evento?.pesoKg) onPesoLleno(evento.pesoKg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento]);

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 1 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Pesaje Camión Lleno</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Peso del camión cargado con aceituna en la báscula de la almazara
      </p>

      <ScaleSVG peso={phase === 'confirmed' && evento ? evento.pesoKg : null} label="midiendo…" />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 2: Volcado en Tolva (button) ─────────────────────────────────────────

function Step2Button({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const [phase, setPhase]   = useState<'idle' | 'tilting' | 'done'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [txHash, setTxHash]   = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function handleClick() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setPhase('tilting');
    setError(null);
    try {
      const result = await registrarVolcadoTolva(loteId, almazaraId);
      setTxHash(result.txHash);
      setPhase('done');
    } catch (err) {
      submittingRef.current = false;
      setPhase('idle');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 2 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Volcado en Tolva</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        La compuerta trasera se abre y la aceituna cae en la tolva de recepción
      </p>

      <CompuertaVolcadoSVG phase={phase} />

      {phase === 'done' ? (
        <StepSuccessCard
          txHash={txHash}
          onAdvance={() => onSuccess({ label: 'Volcado en Tolva', txHash })}
        />
      ) : (
        <>
          {error && (
            <ErrorCard
              message={error}
              onRetry={() => { submittingRef.current = false; setError(null); }}
            />
          )}
          <button onClick={handleClick} disabled={loading} className={BTN_CLS}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Volcando…
              </span>
            ) : 'Abrir Compuerta y Volcar →'}
          </button>
        </>
      )}
    </div>
  );
}

// ── Step 3: Pesaje Camión Vacío (IoT) ─────────────────────────────────────────

function Step3IoT({ loteId, almazaraId, onSuccess, onPesoVacio }: IotStepProps & { onPesoVacio: (kg: number) => void }) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarPesajeCamionVacio(loteId, almazaraId),
    onSuccess,
    'Pesaje Camión Vacío',
  );

  useEffect(() => {
    if (evento?.pesoKg) onPesoVacio(evento.pesoKg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento]);

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 3 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Pesaje Camión Vacío</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Tara del vehículo tras el volcado para calcular el peso neto de aceituna
      </p>

      <ScaleSVG peso={phase === 'confirmed' && evento ? evento.pesoKg : null} label="midiendo…" />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 4: Peso Neto (display only) ──────────────────────────────────────────

function Step4Display({ pesoLleno, pesoVacio, onContinue }: {
  pesoLleno: number;
  pesoVacio: number;
  onContinue: () => void;
}) {
  const pesoNeto = Math.max(0, pesoLleno - pesoVacio);

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 4 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Peso Neto de Aceituna</h2>
      <p className="text-white/40 text-sm mb-10 leading-relaxed">
        Diferencia entre el peso del camión lleno y vacío
      </p>

      <div className="mb-8 bg-white/5 border border-white/10 px-6 py-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-olive-500 mb-1">Camión lleno</p>
            <p className="font-serif text-2xl font-bold text-white">
              {pesoLleno.toLocaleString('es-ES')} <span className="text-olive-400 text-sm font-normal">kg</span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-olive-500 mb-1">Camión vacío (tara)</p>
            <p className="font-serif text-2xl font-bold text-white/60">
              {pesoVacio.toLocaleString('es-ES')} <span className="text-white/30 text-sm font-normal">kg</span>
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-olive-500 mb-1">Peso neto aceituna</p>
          <p className="font-serif text-4xl font-bold text-green-400">
            {pesoNeto.toLocaleString('es-ES')} <span className="text-green-600 text-xl font-normal">kg</span>
          </p>
        </div>
      </div>

      <button onClick={onContinue} className={BTN_CLS}>
        Continuar al Lavado →
      </button>
    </div>
  );
}

// ── Step 5: Lavado (IoT) ──────────────────────────────────────────────────────

function Step5IoT({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarLavado(loteId, almazaraId),
    onSuccess,
    'Lavado',
  );

  let aguaApta        = true;
  let temperaturaAgua = 0;
  let phAgua          = 0;
  try {
    if (evento?.metadatos) {
      const m = JSON.parse(evento.metadatos) as Record<string, unknown>;
      aguaApta        = Boolean(m.aguaApta);
      temperaturaAgua = Number(m.temperaturaAgua);
      phAgua          = Number(m.phAgua);
    }
  } catch { /* ignore */ }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 5 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Lavado y Limpieza</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Control de calidad del agua de lavado
      </p>

      <WashingSVG />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <>
          <div className="mb-6 bg-white/5 border border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-3">
              Parámetros del agua
            </p>
            <p className={`text-sm font-bold mb-2 ${aguaApta ? 'text-green-400' : 'text-red-400'}`}>
              {aguaApta ? '✓ Agua Apta' : '✗ Agua No Apta'}
            </p>
            <p className="text-sm text-white/60">
              Temp:{' '}
              <span className="text-white font-medium">{(temperaturaAgua / 10).toFixed(1)}°C</span>
              {'  |  '}
              pH:{' '}
              <span className="text-white font-medium">{(phAgua / 10).toFixed(1)}</span>
            </p>
          </div>
          <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
        </>
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 6: Pesaje en Cinta (IoT) ─────────────────────────────────────────────

function Step6IoT({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarPesajeCinta(loteId, almazaraId),
    onSuccess,
    'Pesaje en Cinta',
  );

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 6 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Pesaje en Cinta</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Peso de la aceituna limpia en la cinta transportadora
      </p>

      <ConveyorSVG peso={phase === 'confirmed' && evento ? evento.pesoKg : null} />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <>
          <div className="mb-6 bg-white/5 border border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-2">Sensor IoT</p>
            <p className="font-serif text-3xl font-bold text-white">
              {evento.pesoKg?.toLocaleString('es-ES')}{' '}
              <span className="text-olive-400 text-xl font-normal">kg</span>
            </p>
            <p className="text-xs text-white/30 mt-1">Peso en báscula de cinta</p>
          </div>
          <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
        </>
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 7: Molienda (IoT) ────────────────────────────────────────────────────

function Step7IoT({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarMolienda(loteId, almazaraId),
    onSuccess,
    'Molienda Iniciada',
  );

  let temperaturaC = 0;
  try {
    if (evento?.metadatos) {
      const m = JSON.parse(evento.metadatos) as Record<string, unknown>;
      temperaturaC = Number(m.temperaturaC);
    }
  } catch { /* ignore */ }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 7 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Molienda</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Las aceitunas se trituran en el molino para obtener la pasta
      </p>

      <MillSVG temperaturaC={phase === 'confirmed' ? temperaturaC : 0} />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <>
          <div className="mb-6 bg-white/5 border border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-2">Sensor molino</p>
            <p className="font-serif text-3xl font-bold text-white mb-1">
              {(temperaturaC / 10).toFixed(1)}{' '}
              <span className="text-olive-400 text-xl font-normal">°C</span>
            </p>
            <p className="text-xs text-white/30">Temperatura registrada</p>
          </div>
          <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
        </>
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 8: Temperatura de Batido (IoT) ───────────────────────────────────────

function Step8IoT({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarTemperaturaBatido(loteId, almazaraId),
    onSuccess,
    'Temperatura Batido',
  );

  let temperaturaC = 0;
  try {
    if (evento?.metadatos) {
      const m = JSON.parse(evento.metadatos) as Record<string, unknown>;
      temperaturaC = Number(m.temperaturaC);
    }
  } catch { /* ignore */ }

  const overLimit = temperaturaC > 270;

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 8 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Temperatura de Batido</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Parámetro crítico para la certificación Virgen Extra (&lt; 27°C)
      </p>

      <BatidoSVG temperaturaC={phase === 'confirmed' ? temperaturaC : 0} />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <>
          <div className="mb-6 bg-white/5 border border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-2">Sonda de batido</p>
            <p className="font-serif text-3xl font-bold text-white mb-2">
              {(temperaturaC / 10).toFixed(1)}{' '}
              <span className="text-olive-400 text-xl font-normal">°C</span>
            </p>
            <p className={`text-sm font-medium ${overLimit ? 'text-red-400' : 'text-green-400'}`}>
              {overLimit ? '⚠️ Sobre límite AOVE' : '✓ Virgen Extra'}
            </p>
          </div>
          <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
        </>
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 9: Decanter (IoT) ────────────────────────────────────────────────────

function Step9IoT({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarDecanter(loteId, almazaraId),
    onSuccess,
    'Decanter',
  );

  let litrosAceite = 0;
  let kgAlpeorujo  = 0;
  try {
    if (evento?.metadatos) {
      const m = JSON.parse(evento.metadatos) as Record<string, unknown>;
      litrosAceite = Number(m.litrosAceite);
      kgAlpeorujo  = Number(m.kgAlpeorujo);
    }
  } catch { /* ignore */ }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 9 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Decanter</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Separación centrífuga: aceite, alpeorujo y alpechín
      </p>

      <DecanterSVG
        litros={phase === 'confirmed' ? litrosAceite : 0}
        alpeorujo={phase === 'confirmed' ? kgAlpeorujo : 0}
      />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <>
          <div className="mb-6 bg-white/5 border border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-3">
              Resultados del decanter
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Aceite</p>
                <p className="text-white font-bold text-lg">
                  {litrosAceite.toLocaleString('es-ES')} L
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Alpeorujo</p>
                <p className="text-white font-bold text-lg">
                  {kgAlpeorujo.toLocaleString('es-ES')} kg
                </p>
              </div>
            </div>
          </div>
          <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
        </>
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 10: Centrifugadora (IoT) ─────────────────────────────────────────────

function Step10IoT({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarCentrifugadora(loteId, almazaraId),
    onSuccess,
    'Centrifugadora',
  );

  let revoluciones = 0;
  let temperatura  = 0;
  try {
    if (evento?.metadatos) {
      const m = JSON.parse(evento.metadatos) as Record<string, unknown>;
      revoluciones = Number(m.revoluciones);
      temperatura  = Number(m.temperatura);
    }
  } catch { /* ignore */ }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 10 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Centrifugadora</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Separación vertical de aceite y alpechín
      </p>

      <CentrifugadoraSVG
        rpm={phase === 'confirmed' ? revoluciones : 0}
        temp={phase === 'confirmed' ? temperatura : 0}
      />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <>
          <div className="mb-6 bg-white/5 border border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-3">Centrifugadora</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Revoluciones</p>
                <p className="text-white font-bold text-lg">
                  {revoluciones.toLocaleString('es-ES')} rpm
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Temperatura</p>
                <p className="text-white font-bold text-lg">
                  {(temperatura / 10).toFixed(1)} °C
                </p>
              </div>
            </div>
          </div>
          <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
        </>
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── Step 11: Extracción Finalizada (IoT) ──────────────────────────────────────

function Step11IoT({ loteId, almazaraId, onSuccess }: IotStepProps) {
  const { phase, evento, errorMsg, handleRetry, advance } = useIotFlow(
    () => solicitarExtraccion(loteId, almazaraId),
    onSuccess,
    'Extracción Finalizada',
  );

  let litrosAceiteTotal     = 0;
  let rendimientoPorcentaje = 0;
  try {
    if (evento?.metadatos) {
      const m = JSON.parse(evento.metadatos) as Record<string, unknown>;
      litrosAceiteTotal     = Number(m.litrosAceiteTotal);
      rendimientoPorcentaje = Number(m.rendimientoPorcentaje);
    }
  } catch { /* ignore */ }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">Paso 11 de 11</p>
      <h2 className="font-serif text-4xl font-bold text-white mb-2">Extracción Finalizada</h2>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">
        Aceite de oliva virgen extra certificado en blockchain
      </p>

      <OilDropsSVG
        litros={phase === 'confirmed' ? litrosAceiteTotal : 0}
        rendimiento={phase === 'confirmed' ? rendimientoPorcentaje : 0}
      />

      {phase === 'connecting' && <IotConnecting />}
      {phase === 'receiving'  && <IotReceiving />}

      {phase === 'confirmed' && evento && (
        <>
          <div className="mb-6 bg-white/5 border border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.25em] text-olive-500 mb-3">Producción total</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Aceite total</p>
                <p className="text-white font-bold text-lg">
                  {litrosAceiteTotal.toLocaleString('es-ES')} L
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Rendimiento</p>
                <p className="text-white font-bold text-lg">
                  {(rendimientoPorcentaje / 10).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <StepSuccessCard txHash={evento.txHash} onAdvance={advance} />
        </>
      )}

      {phase === 'error' && (
        <ErrorCard message={errorMsg ?? 'Error desconocido'} onRetry={handleRetry} />
      )}
    </div>
  );
}

// ── AlmazaraFlow ──────────────────────────────────────────────────────────────

export default function AlmazaraFlow() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeLoteId =
    (location.state as { loteId?: string } | null)?.loteId ?? '';

  const [currentStep, setCurrentStep]               = useState(1);
  const [txHashes, setTxHashes]                     = useState<TxEntry[]>([]);
  const [loteId, setLoteId]                         = useState(routeLoteId);
  const [loteIdInput, setLoteIdInput]               = useState('');
  const [almazaraId, setAlmazaraId]                 = useState('ALM-JAEN-01');
  const [almazaraIdInput, setAlmazaraIdInput]       = useState('ALM-JAEN-01');
  const [almazaraIdConfirmed, setAlmazaraIdConfirmed] = useState(false);

  // Pesajes para el cálculo de peso neto (step 4)
  const [pesoLleno, setPesoLleno] = useState(0);
  const [pesoVacio, setPesoVacio] = useState(0);

  const hasLoteId   = loteId.trim().length > 0;
  const isCompleted = currentStep > 11;

  function handleLoteIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = loteIdInput.trim();
    if (trimmed) setLoteId(trimmed);
  }

  function handleAlmazaraSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = almazaraIdInput.trim();
    if (trimmed) {
      setAlmazaraId(trimmed);
      setAlmazaraIdConfirmed(true);
    }
  }

  function handleGenericSuccess(entry: TxEntry) {
    setTxHashes(prev => [...prev, entry]);
    setCurrentStep(prev => prev + 1);
  }

  // El paso 4 es solo visualización — avanzar manualmente sin llamada a la API
  function handleStep4Continue() {
    // El paso 4 no genera txHash — insertar marcador solo visual
    setTxHashes(prev => [...prev, { label: 'Peso Neto Aceituna', txHash: null }]);
    setCurrentStep(5);
  }

  return (
    <div className="min-h-screen bg-olive-900 flex flex-col">

      {/* ── Cabecera ── */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-olive-500 text-sm uppercase tracking-widest hover:text-olive-300 transition-colors"
        >
          ← Inicio
        </button>

        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-olive-500">
            Fase Almazara
          </p>
          {hasLoteId && (
            <p className="font-mono text-xs text-white/35 mt-0.5">{loteId}</p>
          )}
        </div>

        <div className="w-20" />
      </header>

      {/* ── Sin loteId: formulario de entrada ── */}
      {!hasLoteId && (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-sm animate-fade-in-up text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">
              Fase Almazara
            </p>
            <h2 className="font-serif text-4xl font-bold text-white mb-3">
              Iniciar Proceso
            </h2>
            <p className="text-white/40 text-sm mb-10 leading-relaxed">
              Introduce el ID del lote para iniciar el proceso
            </p>
            <form onSubmit={handleLoteIdSubmit}>
              <input
                type="text"
                value={loteIdInput}
                onChange={e => setLoteIdInput(e.target.value)}
                placeholder="LOT-2026-0001"
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white/50 outline-none text-white placeholder:text-white/20 py-3 text-base transition-colors duration-150 text-center mb-10"
              />
              <button
                type="submit"
                disabled={!loteIdInput.trim()}
                className="w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Iniciar →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Pantalla de configuración de almazaraId ── */}
      {hasLoteId && !almazaraIdConfirmed && (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-sm animate-fade-in-up text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">
              Proceso de Extracción
            </p>
            <h2 className="font-serif text-4xl font-bold text-white mb-3">
              Iniciar Extracción
            </h2>
            <p className="text-white/40 text-sm mb-10 leading-relaxed">
              Introduce el identificador de la almazara para iniciar
            </p>
            <form onSubmit={handleAlmazaraSubmit}>
              <input
                type="text"
                value={almazaraIdInput}
                onChange={e => setAlmazaraIdInput(e.target.value)}
                placeholder="ALM-JAEN-01"
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white/50 outline-none text-white placeholder:text-white/20 py-3 text-base transition-colors duration-150 text-center mb-10"
              />
              <button
                type="submit"
                disabled={!almazaraIdInput.trim()}
                className="w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Iniciar Proceso de Extracción →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Diseño en dos columnas (pasos 1-11) ── */}
      {hasLoteId && almazaraIdConfirmed && !isCompleted && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">

          {/* IZQUIERDA: Diagrama de proceso (35%) */}
          <div className="w-full md:w-[35%] border-b md:border-b-0 md:border-r border-white/8 flex-shrink-0">
            <ProcessDiagram currentStep={currentStep} txHashes={txHashes} />
          </div>

          {/* DERECHA: Paso activo (65%) */}
          <div className="flex-1 flex items-center justify-center px-8 py-10 overflow-y-auto">

            {currentStep === 1 && (
              <Step1IoT
                loteId={loteId}
                almazaraId={almazaraId}
                onPesoLleno={setPesoLleno}
                onSuccess={(entry) => {
                  setTxHashes(prev => [...prev, entry]);
                  setCurrentStep(2);
                }}
              />
            )}
            {currentStep === 2 && (
              <Step2Button
                loteId={loteId}
                almazaraId={almazaraId}
                onSuccess={(entry) => {
                  setTxHashes(prev => [...prev, entry]);
                  setCurrentStep(3);
                }}
              />
            )}
            {currentStep === 3 && (
              <Step3IoT
                loteId={loteId}
                almazaraId={almazaraId}
                onPesoVacio={setPesoVacio}
                onSuccess={(entry) => {
                  setTxHashes(prev => [...prev, entry]);
                  setCurrentStep(4);
                }}
              />
            )}
            {currentStep === 4 && (
              <Step4Display
                pesoLleno={pesoLleno}
                pesoVacio={pesoVacio}
                onContinue={handleStep4Continue}
              />
            )}
            {currentStep === 5 && (
              <Step5IoT loteId={loteId} almazaraId={almazaraId} onSuccess={handleGenericSuccess} />
            )}
            {currentStep === 6 && (
              <Step6IoT loteId={loteId} almazaraId={almazaraId} onSuccess={handleGenericSuccess} />
            )}
            {currentStep === 7 && (
              <Step7IoT loteId={loteId} almazaraId={almazaraId} onSuccess={handleGenericSuccess} />
            )}
            {currentStep === 8 && (
              <Step8IoT loteId={loteId} almazaraId={almazaraId} onSuccess={handleGenericSuccess} />
            )}
            {currentStep === 9 && (
              <Step9IoT loteId={loteId} almazaraId={almazaraId} onSuccess={handleGenericSuccess} />
            )}
            {currentStep === 10 && (
              <Step10IoT loteId={loteId} almazaraId={almazaraId} onSuccess={handleGenericSuccess} />
            )}
            {currentStep === 11 && (
              <Step11IoT loteId={loteId} almazaraId={almazaraId} onSuccess={handleGenericSuccess} />
            )}
          </div>
        </div>
      )}

      {/* ── Pantalla de finalización (paso 12+) ── */}
      {hasLoteId && isCompleted && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 overflow-y-auto">
          <div className="w-full max-w-lg animate-scale-in text-center">

            <div className="text-6xl mb-8 animate-pulse">🫒</div>

            <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">
              Proceso completado
            </p>
            <h2 className="font-serif text-5xl font-bold text-white mb-4">
              Extracción Completada
            </h2>
            <p className="text-white/40 text-base mb-12 leading-relaxed">
              Todos los eventos certificados en blockchain
            </p>

            {/* Resumen de txHashes */}
            <div className="bg-white/5 border border-white/10 px-7 py-6 mb-10 text-left space-y-4">
              {txHashes.filter(e => e.txHash !== null).map((entry, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.15em] text-olive-500 mb-0.5">
                      {entry.label}
                    </p>
                    {entry.txHash ? (
                      <div className="flex items-center">
                        <code className="text-xs text-white/45 font-mono">
                          {entry.txHash.slice(0, 10)}…{entry.txHash.slice(-6)}
                        </code>
                        <CopyButton text={entry.txHash} />
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 font-mono">sin hash</p>
                    )}
                  </div>
                  <span className="text-green-500 text-xs flex-shrink-0 mt-0.5 font-bold">✓</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/trazabilidad', { state: { loteId } })}
              className="w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 transition-colors mb-3"
            >
              Ver Trazabilidad Completa →
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-transparent text-white border border-white/25 font-bold text-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
            >
              Volver al inicio
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
