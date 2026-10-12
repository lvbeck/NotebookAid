import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
import { PasskeyScreenComponent } from './app/passkey.component';

window.notebookAid.appPasskeys('status').then(state => {
  PasskeyScreenComponent.initial = state;
  return bootstrapApplication(state.locked ? PasskeyScreenComponent : AppComponent, { providers: [provideZonelessChangeDetection()] });
})
  .catch(error => console.error('Application bootstrap failed', error));
