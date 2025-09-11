import {Component, EventEmitter, inject, Output} from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouteStore } from '../../services/route-store.service';
import {MatTooltipModule} from '@angular/material/tooltip';
import {AppRoute} from '../../models/routes.model';
import {OrsProfile} from '../../models/ors-profile.model';
import {profiles} from '../../models/ors-profile.model';

@Component({
  selector: 'app-saved-routes',
  standalone: true,
  imports: [MatListModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './saved-routes.component.html',
  styleUrls: ['./saved-routes.component.scss']
})
export class SavedRoutesComponent {
  private routeStore = inject(RouteStore);
  @Output() showRoute = new EventEmitter();

  /** Icon zum Profil finden */
  getProfileIcon(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.icon ?? 'help_outline';
  }

  getProfileLabel(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.label ?? 'help_outline';
  }
  savedRoutes = this.routeStore.savedRoutes;

  displayRoute(route: AppRoute): string {
    return `${route.name}`;
  }

  remove(id: string): void {
    this.routeStore.removeSavedRoute(id);
  }

  toMap(id: string): void {
    this.showRoute.emit(id);
  }
}
