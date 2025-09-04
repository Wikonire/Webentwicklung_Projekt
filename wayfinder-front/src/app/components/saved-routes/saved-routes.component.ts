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

  constructor(private routesService: RoutesService) {}

  ngOnInit() { this.load(); }

  load() {
    this.routesService.list(this.userId).subscribe(routesRecords => this.savedRoutes = routesRecords);
  }

  remove(id: string) {
    this.routesService.delete(id, this.userId).subscribe(() => this.load());
  }

  displayRoute(routeRecord: RouteRecord): string {
    return routeRecord.name ?? `${routeRecord.startLat},${routeRecord.startLng} → ${routeRecord.endLat},${routeRecord.endLng}`;
  }

  private getUserId(): string {
    let id = localStorage.getItem('wayfinderUserId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('wayfinderUserId', id); }
    return id;
  }
}
