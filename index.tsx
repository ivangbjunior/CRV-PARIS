import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;">Erro Fatal: Elemento root não encontrado.</div>';
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Erro crítico na inicialização da aplicação:", error);
  rootElement.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;">Ocorreu um erro ao carregar a aplicação. Verifique o console.</div>';
}