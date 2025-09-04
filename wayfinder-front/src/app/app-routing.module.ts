import { NgModule } from '@angular/core';
import {RouterModule, Routes, TitleStrategy} from '@angular/router';
import {HomeComponent} from './pages/home/home.component';
import {AppTitleStrategy} from './services/app-title-strategy.service';

const routes: Routes = [
  { path: '', component: HomeComponent, title: `Home`},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [{ provide: TitleStrategy, useClass: AppTitleStrategy }]
})
export class AppRoutingModule { }
