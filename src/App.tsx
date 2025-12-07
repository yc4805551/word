import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';

import Week1 from './pages/Week1';
import Week2 from './pages/Week2';
import Week3 from './pages/Week3';
import Week4 from './pages/Week4';
import Week5 from './pages/Week5';
import Week6 from './pages/Week6';

import { SettingsProvider } from './context/SettingsContext';

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/week1" element={<Week1 />} />
            <Route path="/week2" element={<Week2 />} />
            <Route path="/week3" element={<Week3 />} />
            <Route path="/week4" element={<Week4 />} />
            <Route path="/week5" element={<Week5 />} />
            <Route path="/week6" element={<Week6 />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
