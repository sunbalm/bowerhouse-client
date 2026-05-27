import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BowerHouseSession, Card, GameState, RoomState, Suit } from '../../services/socket.service';
import { suitSymbol } from '../../game/game-utils';
import { GameTableComponent } from '../game-table/game-table';
import { PlayerHandComponent } from '../player-hand/player-hand';
import { ScorePanelComponent, ScorePanelItem } from '../score-panel/score-panel';

type HandResult = NonNullable<GameState['lastHandResult']>;

@Component({
  selector: 'app-game-view',
  standalone: true,
  imports: [CommonModule, GameTableComponent, PlayerHandComponent, ScorePanelComponent],
  templateUrl: './game-view.html',
})
export class GameViewComponent {
  @Input({ required: true }) currentGame!: GameState;
  @Input({ required: true }) currentRoom!: RoomState;
  @Input() currentSession: BowerHouseSession | null = null;
  @Input() actionPending = false;
  @Input() isMyTurn = false;
  @Input() isTwoPlayerDealerTurn = false;
  @Input() availableTrumpSuits: readonly Suit[] = [];
  @Input() canDealerPassNaming = false;
  @Input() turnPercentRemaining = 0;
  @Input() isHost = false;
  @Input() nextHandSecondsRemaining = 0;

  @Output() rematchRequested = new EventEmitter<void>();
  @Output() homeReturned = new EventEmitter<void>();
  @Output() twoPlayerTrumpNamed = new EventEmitter<Suit>();
  @Output() twoPlayerNamingPassed = new EventEmitter<void>();
  @Output() orderedUp = new EventEmitter<void>();
  @Output() orderingPassed = new EventEmitter<void>();
  @Output() trumpNamed = new EventEmitter<Suit>();
  @Output() namingPassed = new EventEmitter<void>();
  @Output() twoPlayerTableCardPlayed = new EventEmitter<{
    card: Card;
    slotIndex: number;
  }>();
  @Output() dealerDiscarded = new EventEmitter<Card>();
  @Output() cardPlayed = new EventEmitter<Card>();
  @Output() twoPlayerHandCardPlayed = new EventEmitter<Card>();

  suitSymbol = suitSymbol;

  get scoreItems(): ScorePanelItem[] {
    return [0, 1].map((index) => ({
      label: this.sidePlayerNames(index),
      score: this.currentGame.score[String(index)] || 0,
    }));
  }

  get trumpLabel() {
    if (!this.currentGame.trumpSuit) {
      return 'Not chosen';
    }

    return `${this.suitSymbol(this.currentGame.trumpSuit)} ${this.currentGame.trumpSuit}`;
  }

  get makerLabel() {
    if (this.currentGame.makerSeat === null || this.currentGame.makerSeat === undefined) {
      return 'None';
    }

    return this.playerNameForSeat(this.currentGame.makerSeat);
  }

  playerNameForSeat(seat: number | null | undefined) {
    if (seat === null || seat === undefined) {
      return 'None';
    }

    return (
      this.currentRoom.players.find((player) => player.seat === seat)?.name || `Seat ${seat + 1}`
    );
  }

  sidePlayerNames(index: number) {
    if (this.currentGame.mode === 'two-player') {
      return this.playerNameForSeat(index);
    }

    const seats = index === 0 ? [0, 2] : [1, 3];

    return seats.map((seat) => this.playerNameForSeat(seat)).join(' / ');
  }

  resultSideLabel(index: number) {
    return this.sidePlayerNames(index);
  }

  resultHeadline(result: HandResult) {
    if (result.result === 'euchred') {
      return `${this.resultSideLabel(result.makerTeam)} got euchred.`;
    }

    const scoringSide = this.resultSideLabel(result.scoringTeam);

    if (result.result === 'march') {
      return `${scoringSide} marched.`;
    }

    if (result.result === 'loner-made') {
      return `${scoringSide} made the loner.`;
    }

    if (result.result === 'loner-march') {
      return `${scoringSide} swept the loner.`;
    }

    return `${scoringSide} made it.`;
  }

  resultSummary(result: HandResult) {
    if (result.result === 'euchred') {
      return `${this.resultSideLabel(result.scoringTeam)} defended the hand and scored.`;
    }

    return `${this.resultSideLabel(result.scoringTeam)} scored for the hand.`;
  }

  resultTrickCount(result: HandResult) {
    const totalTricks = this.currentGame.mode === 'two-player' ? 12 : 5;

    return `${result.makerTricks}/${totalTricks}`;
  }

  ruleSummary() {
    if (!this.currentRoom.rules) {
      return 'Standard rules';
    }

    const enabled = [];

    if (this.currentRoom.rules.stickTheDealer) {
      enabled.push('Stick the Dealer');
    }

    if (this.currentRoom.mode === 'four-player' && this.currentRoom.rules.canadianLoner) {
      enabled.push('Canadian Loner');
    }

    return enabled.length ? enabled.join(' · ') : 'Standard rules';
  }
}
