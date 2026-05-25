import { useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDashed, Copy, Check } from 'lucide-react';
import { getTrazabilidad, type TrazabilidadResponse, type EventoResponse } from '../lib/api';

// ── Configuración de eventos ──────────────────────────────────────────────────

type TipoEvento = EventoResponse['tipoEvento'];

const EVENT_CONFIG: Record<TipoEvento, {
  emoji: string;
  label: string;
  sublabel: string;
  accent: string;   // clase de color para el borde izquierdo
}> = {
  LOTE_CREADO: {
    emoji: '🫒',
    label: 'Lote Creado',
    sublabel: 'Inicio de cadena',
    accent: 'border-l-olive-600',
  },
  CAMION_CERRADO: {
    emoji: '🔒',
    label: 'Camión Cerrado',
    sublabel: 'Cierre de transporte',
    accent: 'border-l-amber-500',
  },
  PESAJE_REGISTRADO: {
    emoji: '⚖️',
    label: 'Pesaje Registrado',
    sublabel: 'Control de peso',
    accent: 'border-l-slate-400',
  },
};

// ── Utilidades ────────────────────────────────────────────────────────────────

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortHash(h: string) { return `${h.slice(0, 14)}…${h.slice(-8)}`; }

// ── Botón de copiar ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} title="Copiar hash completo"
      className="p-1 text-[#aaaaaa] hover:text-[#111111] transition-colors">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Tarjeta de evento ─────────────────────────────────────────────────────────

function EventoCard({ evento, index, isLast }: {
  evento: EventoResponse;
  index: number;
  isLast: boolean;
}) {
  const cfg = EVENT_CONFIG[evento.tipoEvento];

  return (
    <div
      className="flex gap-6 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Eje de la línea temporal */}
      <div className="flex flex-col items-center flex-shrink-0 pt-5">
        <div className="w-11 h-11 rounded-full border border-[#e5e5e5] bg-white flex items-center justify-center text-xl shadow-sm flex-shrink-0">
          {cfg.emoji}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-[#e5e5e5] mt-3 min-h-[2rem]" />
        )}
      </div>

      {/* Tarjeta */}
      <div className={`flex-1 mb-8 bg-white border border-[#e5e5e5] border-l-4 ${cfg.accent} hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow duration-200`}>
        <div className="p-6">
          {/* Cabecera */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#aaaaaa] font-semibold mb-1.5">
                {cfg.sublabel}
              </p>
              <h4 className="font-serif text-xl font-bold text-[#111111] leading-none">
                {cfg.label}
              </h4>
            </div>
            <p className="text-xs text-[#aaaaaa] whitespace-nowrap pt-1 tabular-nums">
              {formatTs(evento.timestamp)}
            </p>
          </div>

          {/* Peso */}
          {evento.pesoKg !== null && (
            <div className="flex items-baseline gap-2 mb-5">
              <span className="font-serif text-3xl font-bold text-[#111111]">{evento.pesoKg}</span>
              <span className="text-sm text-[#767676] font-medium">kg registrados</span>
            </div>
          )}

          {/* Hash de transacción */}
          {evento.txHash ? (
            <div className="flex items-center gap-3 bg-[#fafafa] border border-[#e5e5e5] px-4 py-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-olive-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-[#aaaaaa] font-bold mb-0.5">
                  Verificado en blockchain
                </p>
                <code className="text-xs text-[#444444] font-mono">
                  {shortHash(evento.txHash)}
                </code>
              </div>
              <CopyButton text={evento.txHash} />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#fafafa] border border-[#e5e5e5] px-4 py-3">
              <CircleDashed className="w-3.5 h-3.5 text-[#cccccc] flex-shrink-0" />
              <span className="text-xs text-[#aaaaaa]">Sin verificación blockchain</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TrazabilidadPage ──────────────────────────────────────────────────────────

export default function TrazabilidadPage() {
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<TrazabilidadResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = query.trim().toUpperCase();
    if (!id) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await getTrazabilidad(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white min-h-[calc(100vh-56px)]">

      {/* ── Cabecera de página + búsqueda ── */}
      <div className="border-b border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto px-8 pt-16 pb-12">
          <p className="text-[11px] uppercase tracking-[0.22em] text-olive-600 font-semibold mb-4">
            Consulta
          </p>
          <h2 className="font-serif text-5xl font-bold text-[#111111] mb-10">
            Trazabilidad
          </h2>

          {/* Búsqueda minimalista */}
          <form onSubmit={handleSearch} className="flex items-end gap-0 max-w-2xl border-b border-[#111111]">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="LOT-2026-0001"
              className="flex-1 bg-transparent border-none outline-none text-xl py-3 font-mono text-[#111111] placeholder-[#cccccc] tracking-wide"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 pb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#111111] disabled:text-[#aaaaaa] hover:text-olive-700 transition-colors whitespace-nowrap pl-6"
            >
              {loading ? 'Buscando…' : (
                <>Buscar <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Resultados ── */}
      <div className="max-w-4xl mx-auto px-8 py-14">

        {/* Error */}
        {error && (
          <div className="animate-scale-in mb-8 border border-[#e5e5e5] border-l-4 border-l-red-400 px-5 py-4 text-sm text-[#444444]">
            {error}
          </div>
        )}

        {/* Cabecera del resultado */}
        {result && (
          <div>
            <div className="animate-fade-in flex items-baseline justify-between mb-12 pb-6 border-b border-[#e5e5e5]">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#aaaaaa] mb-2">Lote identificado</p>
                <h3 className="font-serif text-4xl font-bold text-[#111111] tracking-tight">
                  {result.loteId}
                </h3>
              </div>
              <div className="text-right">
                <p className="font-serif text-4xl font-bold text-[#111111]">{result.eventos.length}</p>
                <p className="text-[11px] uppercase tracking-widest text-[#aaaaaa] mt-1">
                  evento{result.eventos.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Línea temporal */}
            <div>
              {result.eventos.map((ev, i) => (
                <EventoCard key={i} evento={ev} index={i} isLast={i === result.eventos.length - 1} />
              ))}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!result && !error && !loading && (
          <div className="animate-fade-in text-center py-28">
            <p className="text-5xl mb-6 opacity-20">🫒</p>
            <p className="text-sm text-[#aaaaaa] font-medium uppercase tracking-widest">
              Introduce un ID de lote
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
