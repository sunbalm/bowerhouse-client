import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
export type GameMode = 'four-player' | 'two-player';

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export interface Card {
  id: string;
  rank: string;
  suit: string;
}

export interface RoomRules {
  stickTheDealer: boolean;
  canadianLoner: boolean;
}

export interface TwoPlayerTableCardSlot {
  faceUp: Card | null;
  faceDown: Card | null;
  hasFaceDown: boolean;
}

export interface RoomReaction {
  seat: number;

  name: string;

  message: string;

  createdAt: number;
}

export interface PlayerSummary {
  seat: number;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSummary {
  id: string;
  tableName: string;
  mode: GameMode;
  players: number;
  maxPlayers: number;
  timerSeconds: number;
  status: string;
  rules: RoomRules;
}

export interface RoomState {
  id: string;
  tableName: string;
  mode: GameMode;
  isPrivate: boolean;
  maxPlayers: number;
  timerSeconds: number;
  status: string;
  players: PlayerSummary[];
  rules: RoomRules;
}

export interface GameState {
  alonePlayerSeat: number | null;
  sittingOutSeat: number | null;
  rules: RoomRules;
  actionRevision: number;
  mode: GameMode;
  phase: string;
  dealerSeat: number;
  activeSeat: number | null;
  trumpSuit: string | null;
  upCard: Card | null;
  tableCards: Record<string, TwoPlayerTableCardSlot[]> | null;
  score: Record<string, number>;
  handScore: Record<string, number>;
  makerSeat: number | null;
  orderedUpBySeat: number | null;
  currentTrick: Array<{
    seat: number;
    card: Card;
  }>;
  completedTricks: Array<{
    plays: Array<{
      seat: number;
      card: Card;
    }>;
    winnerSeat: number;
    winningTeam: number;
  }>;
  handCompletedAt: number | null;
  leadSeat: number | null;
  turnStartedAt: number;
  hand: Card[];
  handCounts: Record<string, number>;
  orderingPasses: number[];
  namingPasses: number[];
  lastHandResult: {
    makerSeat: number;
    makerTeam: number;
    defenderTeam: number;
    makerTricks: number;
    result: string;
    scoringTeam: number;
    pointsAwarded: number;
  } | null;

  lastAutoAction: {
    seat: number;
    type: string;
    suit?: string;
    card?: Card;
    message: string;
    createdAt: number;
  } | null;

  winningTeam: number | null;

  activityLog: Array<{
    id: string;
    message: string;
    createdAt: number;
  }>;
}

export interface BowerHouseSession {
  roomId: string;
  playerToken: string;
  seat: number;
  actionRevision?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor(private zone: NgZone) {
    this.socket = io(environment.serverUrl, {
      autoConnect: false,
    });
  }

  private inZone<T extends (...args: any[]) => void>(callback: T): T {
    return ((...args: Parameters<T>) => {
      this.zone.run(() => callback(...args));
    }) as T;
  }

  private ack<T>(resolve: (value: T) => void) {
    return (result: T) => {
      this.zone.run(() => resolve(result));
    };
  }

  private emitGameAction(
    eventName: string,
    session: BowerHouseSession,
    payload: Record<string, unknown> = {},
  ): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        eventName,
        {
          roomId: session.roomId,
          playerToken: session.playerToken,
          ...payload,
        },
        this.ack(resolve),
      );
    });
  }

  onReconnectAttempt(callback: () => void) {
    this.socket.io.on('reconnect_attempt', this.inZone(callback));
  }

  onReconnectFailed(callback: () => void) {
    this.socket.io.on('reconnect_failed', this.inZone(callback));
  }

  onDisconnect(callback: () => void) {
    this.socket.on('disconnect', this.inZone(callback));
  }

  onReconnect(callback: () => void) {
    this.socket.io.on('reconnect', this.inZone(callback));
  }

  isConnected() {
    return this.socket.connected;
  }

  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  leaveRoom(session: BowerHouseSession): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        'rooms:leave',
        {
          roomId: session.roomId,
          playerToken: session.playerToken,
          actionRevision: session.actionRevision,
        },
        this.ack(resolve),
      );
    });
  }

  onRoomDeleted(callback: (payload: { roomId: string; reason: string }) => void) {
    this.socket.on('room:deleted', this.inZone(callback));
  }

  onServerError(callback: (payload: { error: string }) => void) {
    this.socket.on('server:error', this.inZone(callback));
  }

  onConnect(callback: () => void) {
    this.socket.on('connect', this.inZone(callback));
  }

  onPublicRoomsUpdate(callback: (rooms: RoomSummary[]) => void) {
    this.socket.on('publicRooms:update', this.inZone(callback));
  }

  onRoomUpdate(callback: (room: RoomState) => void) {
    this.socket.on('room:update', this.inZone(callback));
  }

  onGameUpdate(callback: (game: GameState | null) => void) {
    this.socket.on('game:update', this.inZone(callback));
  }

  listPublicRooms() {
    this.socket.emit('rooms:listPublic');
  }

  onReaction(callback: (reaction: RoomReaction) => void) {
    this.socket.on('room:reaction', this.inZone(callback));
  }

  sendReaction(
    session: BowerHouseSession,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        'room:reaction',
        {
          roomId: session.roomId,
          playerToken: session.playerToken,
          message,
        },
        this.ack(resolve),
      );
    });
  }

  createRoom(payload: {
    hostName: string;

    tableName: string;

    password: string;

    timerSeconds: number;

    mode: GameMode;

    stickTheDealer: boolean;

    canadianLoner: boolean;
  }): Promise<{ ok: boolean; room?: RoomState; session?: BowerHouseSession; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('rooms:create', payload, this.ack(resolve));
    });
  }

  joinPublicRoom(payload: {
    roomId: string;
    name: string;
  }): Promise<{ ok: boolean; room?: RoomState; session?: BowerHouseSession; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('rooms:joinPublic', payload, this.ack(resolve));
    });
  }

  joinPrivateRoom(payload: {
    roomId: string;
    name: string;
    password: string;
  }): Promise<{ ok: boolean; room?: RoomState; session?: BowerHouseSession; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('rooms:joinPrivate', payload, this.ack(resolve));
    });
  }

  resumeSession(session: BowerHouseSession): Promise<{
    ok: boolean;
    room?: RoomState;
    session?: BowerHouseSession;
    error?: string;
  }> {
    return new Promise((resolve) => {
      this.socket.emit('session:resume', session, this.ack(resolve));
    });
  }

  startGame(session: BowerHouseSession): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        'game:start',

        {
          roomId: session.roomId,

          playerToken: session.playerToken,
        },

        this.ack(resolve),
      );
    });
  }

  rematch(
    session: BowerHouseSession,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:rematch', session, { actionRevision });
  }

  nextHand(
    session: BowerHouseSession,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:nextHand', session, { actionRevision });
  }

  orderUp(
    session: BowerHouseSession,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:orderUp', session, { actionRevision });
  }

  passOrdering(
    session: BowerHouseSession,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:passOrdering', session, { actionRevision });
  }

  dealerDiscard(
    session: BowerHouseSession,
    cardId: string,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:dealerDiscard', session, {
      cardId,
      actionRevision,
    });
  }

  nameTrump(
    session: BowerHouseSession,
    suit: Suit,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:nameTrump', session, {
      suit,
      actionRevision,
    });
  }

  passNaming(
    session: BowerHouseSession,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:passNaming', session, { actionRevision });
  }

  playCard(
    session: BowerHouseSession,
    cardId: string,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.emitGameAction('game:playCard', session, {
      cardId,
      actionRevision,
    });
  }

  twoPlayerPlayCard(
    session: BowerHouseSession,
    payload: {
      source: 'hand' | 'table';
      cardId: string;
      slotIndex?: number;
    },
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        'game:twoPlayerPlayCard',
        {
          roomId: session.roomId,
          playerToken: session.playerToken,
          source: payload.source,
          cardId: payload.cardId,
          slotIndex: payload.slotIndex,
          actionRevision,
        },
        this.ack(resolve),
      );
    });
  }

  twoPlayerNameTrump(
    session: BowerHouseSession,
    suit: Suit,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        'game:twoPlayerNameTrump',
        {
          roomId: session.roomId,
          playerToken: session.playerToken,
          suit,
          actionRevision,
        },
        this.ack(resolve),
      );
    });
  }

  twoPlayerPassNaming(
    session: BowerHouseSession,
    actionRevision: number,
  ): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit(
        'game:twoPlayerPassNaming',
        {
          roomId: session.roomId,
          playerToken: session.playerToken,
          actionRevision,
        },
        this.ack(resolve),
      );
    });
  }
}
