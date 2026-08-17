import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppContent } from './App';
import { AppProvider } from './context/AppContext';
import { I18nProvider } from './i18n/i18nContext';
import './index.css';
import 'katex/dist/katex.min.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </I18nProvider>
  </React.StrictMode>
);
