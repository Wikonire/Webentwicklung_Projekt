import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from './pages/home/home.component';
import {SavedRoutesComponent} from './pages/saved-routes/saved-routes.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'saved', component: SavedRoutesComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
