import {Component, Input, inject} from '@angular/core';
import {MatListModule} from '@angular/material/list';
import {MatButtonModule} from '@angular/material/button';
import {TopSearchEntry, RouteStore} from '../../services/route-store.service';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-top-routes',
  standalone: true,
  imports: [MatListModule, MatButtonModule, MatIconModule],
  templateUrl: './top-routes.component.html',
  styleUrls: ['./top-routes.component.scss']
})
export class TopRoutesComponent {
  @Input() topRoutes: TopSearchEntry[] = [];

  private routeStore = inject(RouteStore);

  save(entry: TopSearchEntry): void {
    this.routeStore.saveFromTopSearch(entry);
  }
}
