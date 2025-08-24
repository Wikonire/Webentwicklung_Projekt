import { Component, OnInit } from '@angular/core';
import { RoutesService, RouteRecord } from '../../services/routes.service';
import {MatListModule} from '@angular/material/list';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-saved-routes',
  templateUrl: './saved-routes.component.html',
  styleUrls: ['./saved-routes.component.scss'],
  imports:[MatListModule, MatCardModule, MatIconModule]
})
export class SavedRoutesComponent implements OnInit {
  routes: RouteRecord[] = [];
  userId = this.getUserId();

  constructor(private routesSvc: RoutesService) {}

  ngOnInit() { this.load(); }

  load() {
    this.routesSvc.list(this.userId).subscribe(r => this.routes = r);
  }
  remove(id: string) {
    this.routesSvc.delete(id, this.userId).subscribe(() => this.load());
  }

  private getUserId(): string {
    let id = localStorage.getItem('wayfinderUserId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('wayfinderUserId', id); }
    return id;
  }
}
