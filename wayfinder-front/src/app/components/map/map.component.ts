import {
  AfterViewInit,
  Component,
  effect,
  ElementRef, inject,
  Injector,
  input,
  Input,
  ViewChild
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import * as Leaflet from 'leaflet';
import { RouteFeatureCollection } from '../../models/route-feature-collection.model';
import {AppRoute} from '../../models/routes.model';
import {DecimalPipe} from '@angular/common';
import {DisplayRouteService} from '../../services/display-route.service';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [MatCardModule, DecimalPipe, MatIconModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  // FeatureCollection für Leaflet-Polyline
  geoJsonRouteData = input<RouteFeatureCollection | null>(null);
  displayHelper = inject(DisplayRouteService);

  @Input() route: AppRoute | null = null;

  @ViewChild('mapContainer', { static: true }) mapContainerRef!: ElementRef<HTMLDivElement>;

  private leafletMap?: Leaflet.Map;
  private leafletRouteLayer?: Leaflet.GeoJSON;

  constructor(private angularInjector: Injector) {
    effect(() => {
      const currentGeoJson = this.geoJsonRouteData();
      if (!this.leafletMap) return;
      if (currentGeoJson) {
        this.renderRouteOnMap(currentGeoJson);
      } else {
        this.clearRouteLayer();
      }
    }, { injector: this.angularInjector });
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
    this.clearRouteLayer();
    this.leafletRouteLayer = Leaflet.geoJSON(routeGeoJson as any, {
      style: { color: '#5f00c0', weight: 5 }
    }).addTo(this.leafletMap!);

    const routeBounds = this.leafletRouteLayer.getBounds();
    if (routeBounds.isValid()) {
      this.leafletMap!.fitBounds(routeBounds, { padding: [20, 20] });
    }
  }

  private clearRouteLayer(): void {
    if (this.leafletMap && this.leafletRouteLayer) {
      this.leafletMap.removeLayer(this.leafletRouteLayer);
      this.leafletRouteLayer = undefined;
    }
  }
}
