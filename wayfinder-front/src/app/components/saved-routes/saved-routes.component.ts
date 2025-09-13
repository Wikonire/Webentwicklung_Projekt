import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppRoute } from '../../models/routes.model';
import { OrsProfile, profiles } from '../../models/ors-profile.model';
import { CommonModule } from '@angular/common';
import {RouteStore} from '../../services/route-store.service';
import {DisplayRouteService} from '../../services/display-route.service';

@Component({
  selector: 'app-saved-routes',
  standalone: true,
  imports: [CommonModule, MatListModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './saved-routes.component.html',
  styleUrls: ['./saved-routes.component.scss']
})
export class SavedRoutesComponent {
  private routeStore = inject(RouteStore);
  displayRouteHelper = inject(DisplayRouteService);
  @Output() showRoute = new EventEmitter<{ id:string, profile:OrsProfile }>();

  /** Liste der gespeicherten Routen vom Backend */
  @Input() savedRoutes: AppRoute[] = [];

  /** Icon zum Profil finden */
  getProfileIcon(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.icon ?? 'help_outline';
  }

  getProfileLabel(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.label ?? 'help_outline';
  }


  remove(id: string): void {
    this.routeStore.removeSavedRoute(id);
  }

  toMap(id: string, profile:OrsProfile): void {
    this.showRoute.emit({id, profile});
  }
}
