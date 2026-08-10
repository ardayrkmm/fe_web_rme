import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// --- Patch untuk mencegah error dari Google Translate / Ekstensi Pihak Ketiga ---
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      console.warn('Dicegah crash oleh ekstensi pihak ketiga (removeChild):', child);
      return child;
    }
    return originalRemoveChild.apply(this, arguments as any);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('Dicegah crash oleh ekstensi pihak ketiga (insertBefore):', referenceNode);
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments as any);
  };
}
// -----------------------------------------------------------------------------

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
