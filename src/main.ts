import { bootstrapApplication } from '@angular/platform-browser';
import { ErrorHandler, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { uiText } from './app/ui-i18n';
import { languages } from './app/i18n';
import { UiFailure } from './app/ui-failure';
import { AppComponent } from './app/app.component';
import { PasskeyScreenComponent } from './app/passkey.component';

window.notebookAid.appPasskeys('status').then(state => {
  PasskeyScreenComponent.initial = state;
  return bootstrapApplication(state.locked ? PasskeyScreenComponent : AppComponent, { providers: [provideZonelessChangeDetection(), provideBrowserGlobalErrorListeners(), { provide: ErrorHandler, useExisting: UiFailure }] });
})
  .catch(() => { const message = document.createElement('p'); message.className = 'library-warning'; message.setAttribute('role', 'alert'); message.textContent = uiText(languages.find(item => item.code === PasskeyScreenComponent.initial?.locale)?.code ?? 'en', 'unexpected'); document.querySelector('app-root')?.replaceChildren(message); });
