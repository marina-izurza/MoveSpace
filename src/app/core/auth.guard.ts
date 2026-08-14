import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom, filter } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for getSession() to finish before checking — avoids redirect to login
  // on app open when the session is stored but not yet loaded asynchronously.
  if (!auth.initialized()) {
    await firstValueFrom(toObservable(auth.initialized).pipe(filter(v => v)));
  }

  if (auth.user()) return true;

  sessionStorage.setItem('redirectAfterLogin', state.url);
  return router.createUrlTree(['/login']);
};
