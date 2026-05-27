import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CardFaceComponent } from '../card-face/card-face';
import { GameState, RoomState } from '../../services/socket.service';

export type GamePanel = 'info' | 'reactions' | 'last-trick' | 'log';

@Component({
  selector: 'app-game-panels',
  standalone: true,
  imports: [CommonModule, CardFaceComponent],
  templateUrl: './game-panels.html',
})
export class GamePanelsComponent {
  @Input() room: RoomState | null = null;
  @Input() game: GameState | null = null;
  @Input() activePanel: GamePanel | null = null;
  @Input() showTableLog = true;
  @Input() reactions: readonly string[] = [];
  @Input() mySeatLabel = '';

  @Output() panelToggled = new EventEmitter<GamePanel>();
  @Output() panelClosed = new EventEmitter<void>();
  @Output() settingsOpened = new EventEmitter<void>();
  @Output() roomCodeCopied = new EventEmitter<void>();
  @Output() inviteCopied = new EventEmitter<void>();
  @Output() rulesOpened = new EventEmitter<void>();
  @Output() reactionSent = new EventEmitter<string>();

  get lastCompletedTrick() {
    if (!this.game?.completedTricks?.length) {
      return null;
    }

    return this.game.completedTricks[this.game.completedTricks.length - 1];
  }

  get showGameActions() {
    return Boolean(this.room && this.game);
  }

  playerNameForSeat(seat: number | null | undefined) {
    if (seat === null || seat === undefined) {
      return 'None';
    }

    return this.room?.players.find((player) => player.seat === seat)?.name || `Seat ${seat + 1}`;
  }

  resultSideLabel(index: number) {
    if (this.game?.mode === 'two-player') {
      return this.playerNameForSeat(index);
    }

    const seats = index === 0 ? [0, 2] : [1, 3];

    return seats.map((seat) => this.playerNameForSeat(seat)).join(' / ');
  }

  displaySeatMessage(message: string) {
    return message.replace(/\b[Ss]eat (\d+)\b/g, (_match, seatNumber: string) =>
      this.playerNameForSeat(Number(seatNumber) - 1),
    );
  }

  ruleSummary() {
    if (!this.room?.rules) {
      return 'Standard rules';
    }

    const enabled = [];

    if (this.room.rules.stickTheDealer) {
      enabled.push('Stick the Dealer');
    }

    if (this.room.mode === 'four-player' && this.room.rules.canadianLoner) {
      enabled.push('Canadian Loner');
    }

    return enabled.length ? enabled.join(' · ') : 'Standard rules';
  }
}
