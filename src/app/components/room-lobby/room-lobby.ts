import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BowerHouseSession, RoomState } from '../../services/socket.service';

@Component({
  selector: 'app-room-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-lobby.html',
})
export class RoomLobbyComponent {
  @Input({ required: true }) room!: RoomState;
  @Input() session: BowerHouseSession | null = null;
  @Input() isHost = false;
  @Input() canStartGame = false;
  @Input() statusMessage = '';

  @Output() codeCopied = new EventEmitter<void>();
  @Output() inviteCopied = new EventEmitter<void>();
  @Output() gameStarted = new EventEmitter<void>();
  @Output() tableLeft = new EventEmitter<void>();

  get openSeats() {
    return Array.from({
      length: Math.max(0, this.room.maxPlayers - this.room.players.length),
    });
  }

  get startButtonLabel() {
    if (this.canStartGame) {
      return 'Start Game';
    }

    const remainingSeats = Math.max(0, this.room.maxPlayers - this.room.players.length);

    if (remainingSeats === 1) {
      return 'Waiting for 1 more player';
    }

    return `Waiting for ${remainingSeats} more players`;
  }
}
