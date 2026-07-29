import { Routes } from '@angular/router';
import { RoutinesListComponent } from './features/routines/pages/routines-list';
import { RoutinesDetailComponent } from './features/routines/pages/routines-detail';
import { LoginComponent } from './features/auth/pages/login';
import { ExploreComponent } from './features/explore/pages/explore';
import { SavedComponent } from './features/saved/pages/saved';
import { ProfileComponent } from './features/profile/pages/profile';
import { ShareComponent } from './features/share/pages/share';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'routines', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'routines',     component: RoutinesListComponent,   canActivate: [authGuard] },
  { path: 'routines/:id', component: RoutinesDetailComponent, canActivate: [authGuard] },
  { path: 'explore',      component: ExploreComponent,        canActivate: [authGuard] },
  { path: 'saved',        component: SavedComponent,          canActivate: [authGuard] },
  { path: 'profile',      component: ProfileComponent,        canActivate: [authGuard] },
  { path: 'share',        component: ShareComponent,          canActivate: [authGuard] },
];
