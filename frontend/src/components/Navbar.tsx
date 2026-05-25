import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const { pathname } = useLocation();
  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <header className="bg-olive-900 border-b border-olive-800">
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-center justify-between h-14">

          {/* Marca */}
          <Link to="/" className="flex items-center gap-3 group">
            <span className="text-base leading-none select-none">🫒</span>
            <span className="font-serif text-white text-[15px] font-semibold tracking-wide group-hover:text-olive-200 transition-colors">
              Aceite de Oliva
            </span>
          </Link>

          {/* Navegación */}
          <nav className="flex items-center gap-8">
            {([
              ['/trazabilidad', 'Trazabilidad'],
              ['/registro',     'Registro'],
            ] as const).map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  isActive(to)
                    ? 'text-white'
                    : 'text-olive-400 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}

            <Link to="/registro" className="btn-primary py-2 px-5 text-[11px]">
              Nuevo Lote
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
