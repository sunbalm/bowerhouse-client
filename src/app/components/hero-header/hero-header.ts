import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-hero-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-header.html',
})
export class HeroHeaderComponent {
  @Input() canInstall = false;

  @Output() installRequested = new EventEmitter<void>();
}
