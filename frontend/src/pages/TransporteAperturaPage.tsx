import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { registrarAperturaCompuerta, type EventoResponse } from '../lib/api';

// ── SVG del camión ───────────────────────────────────────────────────────────

function TruckSVG() {
  return (
    <svg
      viewBox="0 0 320 160"
      className="w-full max-w-sm mx-auto drop-shadow-lg"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sombra */}
      <ellipse cx="160" cy="153" rx="110" ry="6" fill="rgba(0,0,0,0.25)" />

      {/* Caja de carga */}
      <rect x="30" y="60" width="180" height="78" rx="4" fill="#1e3009" />
      <rect x="34" y="64" width="172" height="70" rx="3" fill="#263d0f" />
      {/* Nervios de la caja */}
      <line x1="92"  y1="64" x2="92"  y2="134" stroke="#1e3009" strokeWidth="2" />
      <line x1="150" y1="64" x2="150" y2="134" stroke="#1e3009" strokeWidth="2" />
      {/* Contorno de la puerta trasera */}
      <rect x="152" y="66" width="51" height="66" rx="2" fill="none" stroke="#3a5b13" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Aceitunas en la carga */}
      <ellipse cx="60"  cy="99" rx="10" ry="7" fill="#4a7c16" opacity="0.85" />
      <ellipse cx="80"  cy="92" rx="9"  ry="6" fill="#3d6b12" opacity="0.85" />
      <ellipse cx="99"  cy="100" rx="10" ry="7" fill="#4a7c16" opacity="0.85" />
      <ellipse cx="70"  cy="110" rx="9"  ry="6" fill="#3d6b12" opacity="0.85" />
      <ellipse cx="55"  cy="115" rx="8"  ry="5" fill="#4a7c16" opacity="0.75" />
      <ellipse cx="88"  cy="113" rx="10" ry="6" fill="#3d6b12" opacity="0.80" />
      <ellipse cx="107" cy="90"  rx="8"  ry="5" fill="#4a7c16" opacity="0.75" />
      <ellipse cx="118" cy="105" rx="9"  ry="6" fill="#3d6b12" opacity="0.80" />
      <ellipse cx="133" cy="95"  rx="8"  ry="5" fill="#4a7c16" opacity="0.75" />
      <ellipse cx="140" cy="116" rx="8"  ry="5" fill="#3d6b12" opacity="0.75" />

      {/* Cabina */}
      <rect x="210" y="76" width="80" height="62" rx="6" fill="#2e4810" />
      {/* Parabrisas */}
      <rect x="218" y="82" width="50" height="32" rx="3" fill="#1a2e08" />
      <line x1="243" y1="82" x2="243" y2="114" stroke="#3a5b13" strokeWidth="1" opacity="0.6" />
      {/* Detalle de la cabina */}
      <rect x="218" y="118" width="66" height="6" rx="2" fill="#1e3009" />

      {/* Ruedas */}
      <circle cx="75"  cy="139" r="16" fill="#1a2e08" />
      <circle cx="75"  cy="139" r="9"  fill="#2e4810" />
      <circle cx="75"  cy="139" r="3"  fill="#3a5b13" />
      <circle cx="175" cy="139" r="16" fill="#1a2e08" />
      <circle cx="175" cy="139" r="9"  fill="#2e4810" />
      <circle cx="175" cy="139" r="3"  fill="#3a5b13" />
      <circle cx="260" cy="139" r="16" fill="#1a2e08" />
      <circle cx="260" cy="139" r="9"  fill="#2e4810" />
      <circle cx="260" cy="139" r="3"  fill="#3a5b13" />

      {/* Líneas de movimiento */}
      <line x1="22" y1="95"  x2="6"  y2="95"  stroke="#3a5b13" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="22" y1="105" x2="10" y2="105" stroke="#3a5b13" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="22" y1="115" x2="14" y2="115" stroke="#3a5b13" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

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

// ── TransporteAperturaPage ────────────────────────────────────────────────────

const UBICACION = 'N 37.7749, W 3.7890';

export default function TransporteAperturaPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const loteId: string | undefined = (location.state as { loteId?: string } | null)?.loteId;

  const [aperturaResult, setAperturaResult] = useState<EventoResponse | null>(null);
  const [aperturaError, setAperturaError]   = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const firedRef = useRef(false);

  // ── Guardia: loteId no encontrado ────────────────────────────────────────
  if (!loteId) {
    return (
      <div className="min-h-screen bg-olive-900 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-md text-center animate-fade-in-up">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-6" />
          <h2 className="font-serif text-3xl font-bold text-white mb-4">
            Lote no encontrado
          </h2>
          <p className="text-white/45 text-base mb-10 leading-relaxed">
            No se encontró el ID del lote.<br />Vuelve al registro para crear uno.
          </p>
          <button
            onClick={() => navigate('/registro')}
            className="w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 transition-colors"
          >
            ← Ir al registro
          </button>
        </div>
      </div>
    );
  }

  // ── Simular apertura no autorizada ──────────────────────────────────────
  async function handleSimularApertura() {
    if (firedRef.current) return;
    firedRef.current = true;
    setLoading(true);
    setAperturaError(null);
    try {
      const result = await registrarAperturaCompuerta(loteId!, {
        esAutorizada: false,
        ubicacion: UBICACION,
      });
      setAperturaResult(result);
    } catch (err) {
      firedRef.current = false; // permite reintentar en error de red
      setAperturaError(err instanceof Error ? err.message : 'Error al registrar el evento');
    } finally {
      setLoading(false);
    }
  }

  const hasAlert = aperturaResult !== null;

  return (
    <div className="min-h-screen bg-olive-900 flex flex-col">

      {/* ── Cabecera ── */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => navigate('/registro')}
          className="text-olive-500 text-sm uppercase tracking-widest hover:text-olive-300 transition-colors"
        >
          ← Registro
        </button>

        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-olive-500">
            Campo → Transporte → Almazara
          </p>
        </div>

        <div className="w-24" />
      </header>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Título */}
          <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3 text-center">
            En tránsito
          </p>
          <h2 className="font-serif text-5xl font-bold text-white mb-2 text-center">
            Transporte
          </h2>
          <p className="text-white/40 text-base mb-10 leading-relaxed text-center">
            Monitorización del camión en tránsito
          </p>

          {/* Animación del camión */}
          <div className="mb-6 px-2" style={{ animation: 'truckPulse 3s ease-in-out infinite' }}>
            <TruckSVG />
          </div>

          {/* Indicador de estado */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <p className="text-white/70 text-sm">
              Camión en tránsito hacia la almazara...
            </p>
          </div>
          <p className="text-center font-mono text-xs text-olive-600 mb-10">
            {UBICACION}
          </p>

          {/* ── Sección de alerta de apertura ── */}
          <div
            className={`mb-8 border px-6 py-5 transition-all duration-500 ${
              hasAlert
                ? 'border-red-700/60 bg-red-950/30'
                : 'border-white/10 bg-white/3'
            }`}
          >
            {hasAlert ? (
              /* Estado de alerta activa */
              <div className="animate-scale-in">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🚨</span>
                  <p className="text-red-400 font-bold text-sm uppercase tracking-[0.15em]">
                    Apertura no autorizada registrada
                  </p>
                </div>

                {aperturaResult!.txHash && (
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-olive-500 mb-1.5">
                      Transaction Hash
                    </p>
                    <div className="flex items-start gap-1">
                      <code className="text-xs text-white/50 font-mono break-all leading-relaxed">
                        {aperturaResult!.txHash.slice(0, 18)}…{aperturaResult!.txHash.slice(-10)}
                      </code>
                      <CopyButton text={aperturaResult!.txHash} />
                    </div>
                  </div>
                )}

                <p className="text-xs text-white/35 leading-relaxed">
                  Evento certificado en blockchain — continuación del proceso no bloqueada
                </p>
              </div>
            ) : (
              /* Estado por defecto */
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <p className="text-white/60 text-sm">
                    Sensor de compuerta activo — sin alertas
                  </p>
                </div>

                {aperturaError && (
                  <div className="mb-4 flex items-center gap-2 text-red-400 text-xs animate-scale-in">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{aperturaError}</span>
                  </div>
                )}

                <button
                  onClick={handleSimularApertura}
                  disabled={loading || firedRef.current}
                  className="w-full py-3 px-6 bg-transparent text-amber-400 border border-amber-700/50 font-bold text-xs uppercase tracking-[0.18em] hover:border-amber-600 hover:text-amber-300 active:bg-amber-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registrando…
                    </span>
                  ) : (
                    '⚠️ Simular Apertura No Autorizada'
                  )}
                </button>
              </>
            )}
          </div>

          {/* ── Botón continuar ── */}
          <button
            onClick={() => navigate('/almazara', { state: { loteId } })}
            className="w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 active:bg-olive-100 transition-colors"
          >
            Continuar a la Almazara →
          </button>

          {/* Badge del lote */}
          <p className="mt-6 text-center text-xs text-olive-600 font-mono">
            Lote: {loteId}
          </p>

        </div>
      </div>

      {/* Inline keyframe for truck pulse */}
      <style>{`
        @keyframes truckPulse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
