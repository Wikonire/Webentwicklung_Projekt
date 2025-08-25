import { inject, NgModule, provideAppInitializer} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SearchFormComponent } from './components/search-form/search-form.component';
import { MapComponent } from './components/map/map.component';
import { TopRoutesComponent } from './components/top-routes/top-routes.component';
import {ConfigService} from './services/config.service';


@NgModule({
  declarations: [
  ],
  imports: [
    SearchFormComponent,
    MapComponent,
    TopRoutesComponent,
    AppComponent,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,

  ],
  providers: [
    provideAppInitializer(() => inject(ConfigService).load()),
  ],
})
export class AppModule { }
