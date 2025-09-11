import {Component, Input, inject} from '@angular/core';
import {MatListModule} from '@angular/material/list';
import {MatButtonModule} from '@angular/material/button';
import {RouteStore} from '../../services/route-store.service';
import {MatIconModule} from '@angular/material/icon';
import {TopSearchEntry} from '../../models/routes.model';
import {OrsProfile, profiles} from '../../models/ors-profile.model';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'app-top-routes',
  standalone: true,
  imports: [MatListModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './top-routes.component.html',
  styleUrls: ['./top-routes.component.scss']
})
export class TopRoutesComponent {
  @Input() topRoutes: TopSearchEntry[] = [];

  /** Icon zum Profil finden */
  getProfileIcon(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.icon ?? 'help_outline';
  }

  getProfileLabel(profile: OrsProfile): string {
    return profiles.find(p => p.value === profile)?.label ?? 'help_outline';
  }
  private routeStore = inject(RouteStore);
  profiles = profiles;

  save(entry: TopSearchEntry): void {
    this.routeStore.saveFromTopSearch(entry);
  }
}
