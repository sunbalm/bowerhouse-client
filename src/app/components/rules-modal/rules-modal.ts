import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-rules-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rules-modal.html',
})
export class RulesModalComponent {
  @Input() open = false;

  @Output() closed = new EventEmitter<void>();
}
