import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AnalyticsService } from './services/analytics';
import App from './App';
import './index.css';

import { ErrorBoundary } from './components/ErrorBoundary';

const Root = () => {
  useEffect(() => {
    try {
      AnalyticsService.init().catch((err) => {
        console.warn('[Analytics] Init background error:', err);
      });
    } catch (e) {
      console.warn('[Analytics] Init synchronous error:', e);
    }
  }, []);

  return (
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<Root />);
} else {
  console.error('[COBRA GAMES JR] Elemento #root não foi encontrado no DOM.');
}
