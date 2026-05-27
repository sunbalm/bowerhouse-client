import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BowerHouseSession, Card, GameState } from '../../services/socket.service';
import { effectiveSuit } from '../../game/game-utils';
import { CardFaceComponent } from '../card-face/card-face';

@Component({
  selector: 'app-player-hand',
  standalone: true,
  imports: [CommonModule, CardFaceComponent],
  templateUrl: './player-hand.html',
})
export class PlayerHandComponent {
  @Input({ required: true }) currentGame!: GameState;
  @Input() currentSession: BowerHouseSession | null = null;
  @Input() isMyTurn = false;
  @Input() actionPending = false;

  @Output() dealerDiscarded = new EventEmitter<Card>();
  @Output() cardPlayed = new EventEmitter<Card>();
  @Output() twoPlayerHandCardPlayed = new EventEmitter<Card>();

  get canPlayCard() {
    return this.currentGame.phase === 'playing' && this.isMyTurn;
  }

  get canTwoPlayerPlayCard() {
    return this.currentGame.phase === 'two-player-playing' && this.isMyTurn;
  }

  get sortedHand() {
    return this.currentGame.hand;
  }

  isLegalClientCard(card: Card) {
    if (this.currentGame.phase !== 'playing') {
      return true;
    }

    if (!this.canPlayCard) {
      return false;
    }

    const led = this.ledSuit();

    if (!led) {
      return true;
    }

    if (!this.handHasSuit(led)) {
      return true;
    }

    return this.effectiveSuit(card) === led;
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

  playCard(card: Card) {
    if (this.currentGame.phase === 'dealer-discard' && this.isMyTurn) {
      this.dealerDiscarded.emit(card);
      return;
    }

    if (this.canPlayCard && this.isLegalClientCard(card)) {
      this.cardPlayed.emit(card);
      return;
    }

    if (this.canTwoPlayerPlayCard) {
      this.twoPlayerHandCardPlayed.emit(card);
    }
  }

  private handHasSuit(suit: string) {
    return this.currentGame.hand.some((card) => this.effectiveSuit(card) === suit);
  }

  private twoPlayerHasSuit(suit: string) {
    return this.twoPlayerPlayableCards().some((card) => this.effectiveSuit(card) === suit);
  }

  private twoPlayerPlayableCards() {
    if (this.currentGame.mode !== 'two-player') {
      return [];
    }

    const seat = this.currentSession?.seat;

    if (seat === null || seat === undefined || !this.currentGame.tableCards) {
      return [];
    }

    const tableCards = (this.currentGame.tableCards[String(seat)] || [])
      .filter((slot) => slot.faceUp)
      .map((slot) => slot.faceUp!);

    return [...this.currentGame.hand, ...tableCards];
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
