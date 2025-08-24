import { Injectable } from '@angular/core';

const KEY = 'wayfinderUserId';

@Injectable({ providedIn: 'root' })
export class UserIdService {
  get(): string {
    let id = localStorage.getItem(KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
    return id;
  }
}
