import React from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css';
import GlassWorkspaceDemo from '../components/ui/demo';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <GlassWorkspaceDemo />
    </React.StrictMode>
  );
}
