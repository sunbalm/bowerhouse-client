import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  BowerHouseSession,
  Card,
  GameState,
  RoomState,
  SUITS,
  Suit,
} from '../../services/socket.service';
import { CardFaceComponent } from '../card-face/card-face';
import { effectiveSuit, suitSymbol } from '../../game/game-utils';

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule, CardFaceComponent],
  templateUrl: './game-table.html',
})
export class GameTableComponent {
  @Input({ required: true }) currentGame!: GameState;
  @Input({ required: true }) currentRoom!: RoomState;
  @Input() currentSession: BowerHouseSession | null = null;
  @Input() actionPending = false;
  @Input() isMyTurn = false;
  @Input() isTwoPlayerDealerTurn = false;
  @Input() availableTrumpSuits: readonly Suit[] = [];
  @Input() canDealerPassNaming = false;
  @Input() turnPercentRemaining = 0;

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

  suits = SUITS;
  suitSymbol = suitSymbol;

  get orderedPlayers() {
    return [...this.currentRoom.players].sort((a, b) => a.seat - b.seat);
  }

  get twoPlayerBoardPlayers() {
    if (this.currentGame.mode !== 'two-player') {
      return this.orderedPlayers;
    }

    const mySeat = this.currentSession?.seat;

    if (mySeat === null || mySeat === undefined) {
      return this.orderedPlayers;
    }

    return [...this.orderedPlayers].sort((a, b) => {
      const aIsMe = a.seat === mySeat ? 1 : 0;
      const bIsMe = b.seat === mySeat ? 1 : 0;

      return aIsMe - bIsMe || a.seat - b.seat;
    });
  }

  get visibleTablePlayers() {
    const mySeat = this.currentSession?.seat;

    if (mySeat === null || mySeat === undefined) {
      return this.orderedPlayers;
    }

    return this.orderedPlayers.filter((player) => player.seat !== mySeat);
  }

  get canTwoPlayerPlayCard() {
    return this.currentGame.phase === 'two-player-playing' && this.isMyTurn;
  }

  get isUpCardTurnedDown() {
    return this.currentGame.phase === 'naming-trump';
  }

  playerNameForSeat(seat: number | null | undefined) {
    if (seat === null || seat === undefined) {
      return 'None';
    }

    return (
      this.currentRoom.players.find((player) => player.seat === seat)?.name || `Seat ${seat + 1}`
    );
  }

  seatPositionClass(seat: number) {
    const seatCount = this.currentGame.mode === 'two-player' ? 2 : 4;
    const mySeat = this.currentSession?.seat;
    const relativeSeat =
      mySeat === null || mySeat === undefined ? seat : (seat - mySeat + seatCount) % seatCount;

    if (seatCount === 2) {
      const positions: Record<number, string> = {
        0: 'bottom-seat',
        1: 'top-seat',
      };

      return positions[relativeSeat] || '';
    }

    const positions: Record<number, string> = {
      0: 'bottom-seat',
      1: 'left-seat',
      2: 'top-seat',
      3: 'right-seat',
    };

    return positions[relativeSeat] || '';
  }

  cardBacks(seat: number) {
    const count = this.currentGame.handCounts[seat] || 0;

    return Array.from({ length: Math.min(count, 6) });
  }

  twoPlayerTableSlots(seat: number) {
    if (!this.currentGame.tableCards) {
      return [];
    }

    return this.currentGame.tableCards[String(seat)] || [];
  }

  playTableCard(card: Card | null, slotIndex: number) {
    if (!card) {
      return;
    }

    this.twoPlayerTableCardPlayed.emit({ card, slotIndex });
  }

  isLegalTwoPlayerClientCard(card: Card) {
    if (this.currentGame.phase !== 'two-player-playing') {
      return true;
    }

    if (!this.canTwoPlayerPlayCard) {
      return false;
    }

    const led = this.ledSuit();

    if (!led) {
      return true;
    }

    if (!this.twoPlayerHasSuit(led)) {
      return true;
    }

    return this.effectiveSuit(card) === led;
  }

  private twoPlayerPlayableCards() {
    if (this.currentGame.mode !== 'two-player') {
      return [];
    }

    const seat = this.currentSession?.seat;

    if (seat === null || seat === undefined) {
      return [];
    }

    const handCards = this.currentGame.hand.map((card) => ({ card }));
    const tableCards = this.twoPlayerTableSlots(seat)
      .filter((slot) => slot.faceUp)
      .map((slot) => ({ card: slot.faceUp! }));

    return [...handCards, ...tableCards];
  }

  private twoPlayerHasSuit(suit: string) {
    return this.twoPlayerPlayableCards().some((item) => this.effectiveSuit(item.card) === suit);
  }

  private ledSuit() {
    if (this.currentGame.currentTrick.length === 0) {
      return null;
    }

    return this.effectiveSuit(this.currentGame.currentTrick[0].card);
  }

  private effectiveSuit(card: Card) {
    return effectiveSuit(card, this.currentGame.trumpSuit);
  }
}
