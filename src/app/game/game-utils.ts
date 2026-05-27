import { Card, GameMode } from '../services/socket.service';

export function suitSymbol(suit: string | null | undefined) {
  const symbols: Record<string, string> = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
  };

  return symbols[suit || ''] || suit || '';
}

export function cardLabel(card: Card) {
  return `${card.rank}${suitSymbol(card.suit)}`;
}

export function sameColorSuit(suit: string) {
  const map: Record<string, string> = {
    clubs: 'spades',
    spades: 'clubs',
    hearts: 'diamonds',
    diamonds: 'hearts',
  };

  return map[suit] || '';
}

export function isLeftBower(card: Card, trumpSuit: string | null | undefined) {
  return card.rank === 'J' && card.suit === sameColorSuit(trumpSuit || '');
}

export function effectiveSuit(card: Card, trumpSuit: string | null | undefined) {
  return isLeftBower(card, trumpSuit) ? trumpSuit || card.suit : card.suit;
}

export function seatPositionClass(seat: number) {
  const map: Record<number, string> = {
    0: 'bottom-seat',
    1: 'left-seat',
    2: 'top-seat',
    3: 'right-seat',
  };

  return map[seat] || '';
}

export function seatTeamLabel(seat: number, mode: GameMode | undefined) {
  if (mode === 'two-player') {
    return 'Solo';
  }

  return seat === 0 || seat === 2 ? 'Team 1' : 'Team 2';
}
