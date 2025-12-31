import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { CrowdfundingProvider } from './context/CrowdfundingContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CrowdfundingProvider>
      <App />
    </CrowdfundingProvider>
  </React.StrictMode>,
);