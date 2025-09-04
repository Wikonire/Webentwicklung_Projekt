import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  Injector,
  input,
  Input,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import * as Leaflet from 'leaflet';
import { RouteQuery } from '../../models/route-query.model';
import { RouteFeatureCollection } from '../../models/route-feature-collection.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  geoJsonRouteData = input<RouteFeatureCollection | null>(null);

  @Input() route: RouteQuery | null = null;

  @ViewChild('mapContainer', { static: true }) mapContainerRef!: ElementRef<HTMLDivElement>;

  private leafletMap?: Leaflet.Map;
  private leafletRouteLayer?: Leaflet.GeoJSON;

  constructor(private angularInjector: Injector) {
    // Reagiert auf GeoJSON-Änderungen, sobald Map vorhanden ist
    effect(
      () => {
        const currentGeoJson = this.geoJsonRouteData();
        if (!this.leafletMap) return;

        if (currentGeoJson) {
          this.renderRouteOnMap(currentGeoJson);
        } else {
          this.clearRouteLayer();
        }
      },
      { injector: this.angularInjector }
    );
  }

  ngAfterViewInit(): void {
    this.leafletMap = Leaflet.map(this.mapContainerRef.nativeElement, {
      center: [47.3769, 8.5417], // Zürich
      zoom: 8
    });

    Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap-Mitwirkende'
    }).addTo(this.leafletMap);

    const initialGeoJson = this.geoJsonRouteData();
    if (initialGeoJson) {
      this.renderRouteOnMap(initialGeoJson);
    }
  }

  private renderRouteOnMap(routeGeoJson: RouteFeatureCollection): void {
    if (this.leafletMap) {
      this.clearRouteLayer();

      this.leafletRouteLayer = Leaflet.geoJSON(routeGeoJson as any, {
        style: {color: 'blue', weight: 5}
      }).addTo(this.leafletMap);

      const routeBounds = this.leafletRouteLayer.getBounds();
      if (routeBounds.isValid()) {
        this.leafletMap.fitBounds(routeBounds, {padding: [20, 20]});
      }
    }
  }

  private clearRouteLayer(): void {
    if (this.leafletMap && this.leafletRouteLayer) {
      this.leafletMap.removeLayer(this.leafletRouteLayer);
      this.leafletRouteLayer = undefined;
    }
  }
}
