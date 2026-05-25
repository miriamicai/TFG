import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import LandingPage from './pages/LandingPage';
import TrazabilidadPage from './pages/TrazabilidadPage';
import RegistroFlow from './pages/RegistroFlow';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing a pantalla completa — sin navbar */}
        <Route path="/" element={<LandingPage />} />

        {/* Flujo de registro paso a paso — sin navbar */}
        <Route path="/registro" element={<RegistroFlow />} />

        {/* Página de trazabilidad — mantiene navbar y layout */}
        <Route
          path="/trazabilidad"
          element={
            <div className="min-h-screen bg-white">
              <Navbar />
              <main>
                <TrazabilidadPage />
              </main>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
