import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import LandingPage from './pages/LandingPage';
import TrazabilidadPage from './pages/TrazabilidadPage';
import RegistroFlow from './pages/RegistroFlow';
import TransporteAperturaPage from './pages/TransporteAperturaPage';
import AlmazaraFlow from './pages/AlmazaraFlow';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing a pantalla completa — sin navbar */}
        <Route path="/" element={<LandingPage />} />

        {/* Flujo de registro paso a paso — sin navbar */}
        <Route path="/registro" element={<RegistroFlow />} />

        {/* Transporte / apertura de compuerta — sin navbar */}
        <Route path="/campo/transporte" element={<TransporteAperturaPage />} />

        {/* Flujo almazara — sin navbar */}
        <Route path="/almazara" element={<AlmazaraFlow />} />

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
