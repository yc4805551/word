import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Main.tsx executing...');

try {
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);

  if (!rootElement) {
    console.error('FATAL: Root element not found!');
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('Render called successfully');
  }
} catch (e) {
  console.error('CRASH in main.tsx:', e);
}
