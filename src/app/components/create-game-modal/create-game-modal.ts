import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameMode } from '../../services/socket.service';

@Component({
  selector: 'app-create-game-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './create-game-modal.html',
})
export class CreateGameModalComponent {
  @Input() open = false;
  @Input() selectedMode: GameMode = 'four-player';
  @Input() tableName = '';
  @Input() privatePassword = '';
  @Input() timerSeconds = 25;
  @Input() privacyLabel = 'Public table';
  @Input() stickTheDealer = false;
  @Input() canadianLoner = false;
  @Input() formReady = false;

  @Output() closed = new EventEmitter<void>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() selectedModeChange = new EventEmitter<GameMode>();
  @Output() tableNameChange = new EventEmitter<string>();
  @Output() privatePasswordChange = new EventEmitter<string>();
  @Output() timerSecondsChange = new EventEmitter<number>();
  @Output() timerBlurred = new EventEmitter<void>();
  @Output() stickTheDealerChange = new EventEmitter<boolean>();
  @Output() canadianLonerChange = new EventEmitter<boolean>();

  updateMode(value: string) {
    const mode = value === 'two-player' ? 'two-player' : 'four-player';

    this.selectedModeChange.emit(mode);

    if (mode === 'two-player') {
      this.canadianLonerChange.emit(false);
    }
  }
}
