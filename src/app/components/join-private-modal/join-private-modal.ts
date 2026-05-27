import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-join-private-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './join-private-modal.html',
})
export class JoinPrivateModalComponent {
  @Input() open = false;
  @Input() joinRoomCode = '';
  @Input() joinPassword = '';
  @Input() formReady = false;

  @Output() closed = new EventEmitter<void>();
  @Output() rulesRequested = new EventEmitter<void>();
  @Output() joinRequested = new EventEmitter<void>();
  @Output() joinRoomCodeChange = new EventEmitter<string>();
  @Output() joinPasswordChange = new EventEmitter<string>();

  updateRoomCode(value: string) {
    this.joinRoomCodeChange.emit(value.trim().toUpperCase());
  }
}
