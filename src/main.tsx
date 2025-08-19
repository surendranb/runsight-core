import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SecureAppWrapper from './components/SecureAppWrapper.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SecureAppWrapper />
  </StrictMode>
);
