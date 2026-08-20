import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ConverterPage from './pages/ConverterPage';
import PdfConverterPage from './pages/PdfConverterPage';

export default function App() {
  return (
    <BrowserRouter>
      {/* Shared Navbar */}
      <Navbar />

      {/* Main Page Layout Wrapper */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/image-converter" element={<ConverterPage category="image" />} />
        <Route path="/video-converter" element={<ConverterPage category="video" />} />
        <Route path="/pdf-converter" element={<PdfConverterPage />} />
        {/* Wildcard Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>

      {/* Shared Footer */}
      <Footer />
    </BrowserRouter>
  );
}
