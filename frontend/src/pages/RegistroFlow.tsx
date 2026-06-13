import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { crearLote } from '../lib/api';
import CierreCompuertaPage from './CierreCompuertaPage';

type Step = 1 | 2;

const COORD_DEFECTO = '37.7749,-4.7796';

// ── Paso 1: Crear Lote ────────────────────────────────────────────────────────

function CrearLoteStep({ onSuccess }: { onSuccess: (loteId: string) => void }) {
  const [agricultorId, setAgricultorId]       = useState('AGR-001');
  const [origen, setOrigen]                   = useState('Cortijo El Molino, Jaén');
  const [contenedorId, setContenedorId]       = useState('CONT-2026-001');
  const [matriculaCamion, setMatriculaCamion] = useState('1234 BCD');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agricultorId.trim() || !origen.trim() || !contenedorId.trim() || !matriculaCamion.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const lote = await crearLote(
        agricultorId.trim(),
        origen.trim(),
        contenedorId.trim(),
        matriculaCamion.trim(),
        COORD_DEFECTO,
      );
      onSuccess(lote.loteId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-olive-900 flex flex-col">

      {/* Cabecera */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => navigate('/')}
          className="text-olive-500 text-sm uppercase tracking-widest hover:text-olive-300 transition-colors"
        >
          ← Inicio
        </button>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white text-olive-900 text-[11px] font-bold flex items-center justify-center">1</div>
          <div className="w-14 h-px bg-white/15" />
          <div className="w-6 h-6 rounded-full border border-white/20 text-white/25 text-[11px] font-bold flex items-center justify-center">2</div>
        </div>

        <div className="w-20" />
      </header>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md animate-fade-in-up">

          <p className="text-xs uppercase tracking-[0.35em] text-olive-500 mb-3">
            Paso 1 de 2
          </p>
          <h2 className="font-serif text-5xl font-bold text-white mb-2">
            Crear Lote
          </h2>
          <p className="text-white/40 text-base mb-14 leading-relaxed">
            Registra el nuevo lote de aceite e inicia<br />su cadena de trazabilidad.
          </p>

          <form onSubmit={handleSubmit}>

            {/* ID del agricultor */}
            <div className="mb-10">
              <label className="block text-xs font-bold uppercase tracking-[0.22em] text-olive-500 mb-3">
                ID del Agricultor
              </label>
              <input
                type="text"
                value={agricultorId}
                onChange={e => setAgricultorId(e.target.value)}
                placeholder="AGR-001"
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white/50 outline-none text-white placeholder:text-white/18 py-3 text-base transition-colors duration-150"
              />
            </div>

            {/* Origen */}
            <div className="mb-10">
              <label className="block text-xs font-bold uppercase tracking-[0.22em] text-olive-500 mb-3">
                Origen / Finca
              </label>
              <input
                type="text"
                value={origen}
                onChange={e => setOrigen(e.target.value)}
                placeholder="Cortijo El Molino, Jaén"
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white/50 outline-none text-white placeholder:text-white/18 py-3 text-base transition-colors duration-150"
              />
            </div>

            {/* ID Contenedor */}
            <div className="mb-10">
              <label className="block text-xs font-bold uppercase tracking-[0.22em] text-olive-500 mb-3">
                ID Contenedor
              </label>
              <input
                type="text"
                value={contenedorId}
                onChange={e => setContenedorId(e.target.value)}
                placeholder="CONT-2026-001"
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white/50 outline-none text-white placeholder:text-white/18 py-3 text-base transition-colors duration-150"
              />
            </div>

            {/* Matrícula del camión */}
            <div className="mb-14">
              <label className="block text-xs font-bold uppercase tracking-[0.22em] text-olive-500 mb-3">
                Matrícula del Camión
              </label>
              <input
                type="text"
                value={matriculaCamion}
                onChange={e => setMatriculaCamion(e.target.value)}
                placeholder="1234 ABC"
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white/50 outline-none text-white placeholder:text-white/18 py-3 text-base transition-colors duration-150"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="animate-scale-in mb-8 flex items-center gap-3 text-red-400 text-base">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Enviar */}
            <button
              type="submit"
              disabled={loading || !agricultorId.trim() || !origen.trim() || !contenedorId.trim() || !matriculaCamion.trim()}
              className="w-full py-4 bg-white text-olive-900 font-bold text-sm uppercase tracking-[0.2em] hover:bg-olive-50 active:bg-olive-100 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando…
                </span>
              ) : (
                'Crear Lote →'
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

// ── RegistroFlow ──────────────────────────────────────────────────────────────

export default function RegistroFlow() {
  const navigate = useNavigate();
  const [step, setStep]     = useState<Step>(1);
  const [loteId, setLoteId] = useState('');

  function handleLoteCreado(id: string) {
    setLoteId(id);
    setStep(2);
  }

  function handleCompuertaCerrada() {
    navigate('/campo/transporte', { state: { loteId } });
  }

  return (
    <>
      {step === 1 && <CrearLoteStep onSuccess={handleLoteCreado} />}
      {step === 2 && <CierreCompuertaPage loteId={loteId} onContinue={handleCompuertaCerrada} />}
    </>
  );
}
