import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@mdi/font/css/materialdesignicons.min.css';
import 'remixicon/fonts/remixicon.css';
import './styles.css';
import App from './App.jsx';
import { AppProvider } from './store.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppProvider>
      <App />
    </AppProvider>
  </BrowserRouter>
);
