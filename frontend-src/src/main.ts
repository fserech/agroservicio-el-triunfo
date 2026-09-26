import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => {
  console.error('Bootstrap error:', err);
  // Show visible error on page for debugging
  document.body.innerHTML = `
    <div style="padding:20px;font-family:monospace;color:red;background:#fff">
      <h2>CRM Error al iniciar</h2>
      <pre>${err?.message || err}</pre>
      <pre>${err?.stack || ''}</pre>
    </div>`;
});
