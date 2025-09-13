import { Injectable } from '@angular/core';
import {AppRoute} from '../models/routes.model';
import {OrsProfile, profiles} from '../models/ors-profile.model';

@Injectable({
  providedIn: 'root'
})
export class DisplayRouteService {
  displayRoute(route: AppRoute): string {
    return `${route.startLabel }  →  ${route.destinationLabel}`;
  }

  /** Icon zum Profil finden */
  getProfileIcon(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.icon ?? 'help_outline';
  }

  getProfileLabel(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.label ?? 'help_outline';
  }
}
