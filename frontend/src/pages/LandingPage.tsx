import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  // Transición automática tras 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => setShowMenu(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Transición también al hacer scroll
  useEffect(() => {
    function onScroll() { setShowMenu(true); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">

      {/* ── Fase 1: Cortijo a pantalla completa con Ken Burns ── */}
      <div
        className="absolute inset-0"
        style={{
          opacity: showMenu ? 0 : 1,
          transition: 'opacity 0.9s ease-in-out',
          pointerEvents: showMenu ? 'none' : 'auto',
        }}
      >
        <img
          src="/cortijo.jpg"
          alt="Cortijo"
          className="animate-ken-burns w-full h-full object-cover"
        />
        {/* Superposición oscura tipo viñeta */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />

        {/* Texto introductorio */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white select-none">
          <p
            className="text-[11px] uppercase tracking-[0.45em] text-olive-200 mb-6 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            Sistema de Trazabilidad
          </p>
          <h1
            className="font-serif text-7xl md:text-8xl font-bold text-center leading-[1.05] animate-fade-in-up"
            style={{ animationDelay: '0.8s' }}
          >
            Del Campo<br />a la Mesa.
          </h1>
          <div
            className="mt-10 w-px h-16 bg-white/30 animate-fade-in"
            style={{ animationDelay: '2.2s' }}
          />
          <p
            className="mt-4 text-xs text-white/40 uppercase tracking-[0.3em] animate-fade-in"
            style={{ animationDelay: '2.4s' }}
          >
            Scroll para continuar
          </p>
        </div>
      </div>

      {/* ── Fase 2: Pantalla dividida ── */}
      <div
        className="absolute inset-0 flex"
        style={{
          opacity: showMenu ? 1 : 0,
          transition: 'opacity 0.9s ease-in-out',
          pointerEvents: showMenu ? 'auto' : 'none',
        }}
      >
        {/* Mitad izquierda — foto de olivos */}
        <div
          className="w-1/2 relative overflow-hidden"
          style={{
            transform: showMenu ? 'translateX(0)' : 'translateX(-50px)',
            transition: 'transform 1s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <img
            src="/olivos.jpg"
            alt="Olivos"
            className="w-full h-full object-cover"
          />
          {/* Superposición */}
          <div className="absolute inset-0 bg-olive-950/65" />

          {/* Texto del panel izquierdo */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
            <div className="w-10 h-px bg-olive-400/60 mb-8" />
            <p className="font-serif text-3xl italic text-olive-100 leading-relaxed">
              "Del olivo al<br />consumidor —<br />cada paso<br />certificado."
            </p>
            <div className="w-10 h-px bg-olive-400/60 mt-8" />

            <div className="mt-14 grid grid-cols-3 gap-8 text-center">
              {[
                { num: '100%', label: 'On-chain' },
                { num: '3', label: 'Eventos' },
                { num: 'EIP-155', label: 'Firmado' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <p className="font-serif text-2xl font-bold text-white">{num}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-olive-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mitad derecha — menú oscuro estilo oliva */}
        <div
          className="w-1/2 bg-olive-900 flex flex-col items-center justify-center px-16 relative"
          style={{
            transform: showMenu ? 'translateX(0)' : 'translateX(50px)',
            transition: 'transform 1s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Textura sutil */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22 fill=%22%23ffffff%22 opacity=%220.03%22/%3E%3C/svg%3E')] opacity-30" />

          <div className="relative z-10 w-full max-w-xs">

            {/* Marca */}
            <div className="text-center mb-14">
              <div className="w-14 h-px bg-olive-600 mx-auto mb-8" />
              <p className="text-[10px] uppercase tracking-[0.45em] text-olive-500 mb-5">
                Aceite de Oliva
              </p>
              <h2 className="font-serif text-5xl font-bold text-white leading-tight">
                Trazabilidad<br />
                <span className="text-olive-400">Blockchain</span>
              </h2>
              <div className="w-14 h-px bg-olive-600 mx-auto mt-8" />
            </div>

            {/* Opciones del menú */}
            <div className="space-y-4">
              <button
                onClick={() => navigate('/registro')}
                className="w-full py-5 px-8 bg-white text-olive-900 font-bold text-xs uppercase tracking-[0.2em] hover:bg-olive-50 active:bg-olive-100 transition-colors duration-150"
              >
                Registrar Lote
              </button>
              <button
                onClick={() => navigate('/trazabilidad')}
                className="w-full py-5 px-8 bg-transparent text-white border border-olive-600 font-bold text-xs uppercase tracking-[0.2em] hover:bg-olive-800 active:bg-olive-700 transition-colors duration-150"
              >
                Rastrear Lote
              </button>
            </div>

            {/* Sello blockchain */}
            <p className="mt-12 text-[10px] text-olive-600 text-center uppercase tracking-[0.3em]">
              Verificado en blockchain · EIP-155
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
