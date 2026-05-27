import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-modal.html',
})
export class SettingsModalComponent {
  @Input() open = false;
  @Input() hapticsEnabled = true;
  @Input() showTableLog = true;
  @Input() canInstall = false;
  @Input() showIosInstallHint = false;

  @Output() closed = new EventEmitter<void>();
  @Output() hapticsToggled = new EventEmitter<void>();
  @Output() tableLogToggled = new EventEmitter<void>();
  @Output() installRequested = new EventEmitter<void>();
}
