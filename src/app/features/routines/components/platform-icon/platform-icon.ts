import { Component, computed, input } from '@angular/core';
import { detectPlatform, getPlatformName, Platform } from '../../utils/platform';

@Component({
  selector: 'app-platform-icon',
  template: `
    <span class="inline-flex shrink-0" [title]="label()">
      @switch (platform()) {

        @case ('youtube') {
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <rect width="20" height="20" rx="4" fill="#FF0000"/>
            <path d="M8 6.5L14 10 8 13.5V6.5z" fill="white"/>
          </svg>
        }

        @case ('tiktok') {
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <rect width="20" height="20" rx="4" fill="#010101"/>
            <path d="M13.5 3c.1 1.2.9 2.2 2 2.5v2c-.7 0-1.4-.2-2-.6v4.6a3.5 3.5 0 1 1-3.5-3.5h.5v2h-.5a1.5 1.5 0 1 0 1.5 1.5V3h2z" fill="white"/>
          </svg>
        }

        @case ('instagram') {
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <rect width="20" height="20" rx="4" fill="#E1306C"/>
            <rect x="4" y="4" width="12" height="12" rx="3.5" stroke="white" stroke-width="1.5"/>
            <circle cx="10" cy="10" r="3" stroke="white" stroke-width="1.5"/>
            <circle cx="14" cy="6" r="1" fill="white"/>
          </svg>
        }

        @case ('pinterest') {
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <rect width="20" height="20" rx="4" fill="#E60023"/>
            <path d="M10 3a7 7 0 0 0-2.6 13.5c0-.6 0-1.4.1-2l1-4.2s-.3-.5-.3-1.3c0-1.2.7-2.1 1.6-2.1.8 0 1.1.6 1.1 1.3 0 .8-.5 2-.8 3-.2.9.4 1.6 1.3 1.6 1.6 0 2.6-2 2.6-4.4 0-1.8-1.2-3.1-3.1-3.1-2.1 0-3.4 1.6-3.4 3.3 0 .6.2 1.3.5 1.7.1.1.1.2 0 .3l-.3 1.2c0 .2-.2.2-.3.1C6.5 11.5 6 10.4 6 9.2c0-2.5 2-5.2 5.6-5.2 3 0 5 2 5 4.7 0 3.1-1.7 5.4-4.3 5.4-.9 0-1.7-.5-2-1l-.5 2c-.2.7-.7 1.6-1 2.1A7 7 0 1 0 10 3z" fill="white"/>
          </svg>
        }

        @case ('x') {
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <rect width="20" height="20" rx="4" fill="#000"/>
            <path d="M11.18 9.22L15.5 4h-1.1L10.7 8.5 7.6 4H4l4.55 6.62L4 16.5h1.1l3.97-4.62 3.37 4.62H16l-4.82-7.28zm-1.41 1.64-.46-.66L5.42 4.8h1.58l2.96 4.23.46.66 3.86 5.52h-1.58l-3.13-4.45z" fill="white"/>
          </svg>
        }

        @default {
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <rect width="20" height="20" rx="4" fill="#9CA3AF"/>
            <path d="M11 7h2a3 3 0 0 1 0 6h-2m-2 0H7a3 3 0 0 1 0-6h2m-1 3h4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        }

      }
    </span>
  `
})
export class PlatformIconComponent {
  url = input<string>('');
  platform = computed(() => detectPlatform(this.url()));
  label = computed(() => getPlatformName(this.platform()));
}
