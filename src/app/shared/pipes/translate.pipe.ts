import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/language.service';

@Pipe({ name: 't', pure: false, standalone: true })
export class TranslatePipe implements PipeTransform {
  private ls = inject(LanguageService);
  transform(key: string): string {
    return this.ls.t(key);
  }
}
