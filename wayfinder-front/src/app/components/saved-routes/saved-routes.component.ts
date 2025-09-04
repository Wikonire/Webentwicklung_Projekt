import { Component, OnInit } from '@angular/core';
import { RoutesService, RouteRecord } from '../../services/routes.service';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-saved-routes',
  standalone: true,
  templateUrl: './saved-routes.component.html',
  styleUrls: ['./saved-routes.component.scss'],
  imports: [CommonModule, MatListModule, MatIconModule, MatButtonModule],
})
export class SavedRoutesComponent implements OnInit {
  savedRoutes: RouteRecord[] = [];
  userId = this.getUserId();

  constructor(private routesSvc: RoutesService) {}

  ngOnInit() { this.load(); }

  load() {
    this.routesSvc.list(this.userId).subscribe(routesRecords => this.savedRoutes = routesRecords);
  }

  remove(id: string) {
    this.routesSvc.delete(id, this.userId).subscribe(() => this.load());
  }

  displayRoute(r: RouteRecord): string {
    return r.name ?? `${r.startLat},${r.startLng} → ${r.endLat},${r.endLng}`;
  }

  private getUserId(): string {
    let id = localStorage.getItem('wayfinderUserId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('wayfinderUserId', id); }
    return id;
  }
}
