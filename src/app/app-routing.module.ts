import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DrawingComponent } from './drawing/drawing.component';

const routes: Routes = [
  { path: '', component: DrawingComponent },
  { path: 'v1/getSvg', component: DrawingComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
