import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()) return true;

  // Save the attempted URL so login can redirect back (important for /share)
  sessionStorage.setItem('redirectAfterLogin', state.url);
  return router.createUrlTree(['/login']);
};
