import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private cfg: any = {};
  async load() {
    try {
      const res = await fetch('assets/config.json', { cache: 'no-store' });
      this.cfg = await res.json();
    } catch { this.cfg = {}; }
  }
  get apiBaseUrl(): string {
    return this.cfg.apiBaseUrl ?? 'http://localhost:3000';
  }
}
