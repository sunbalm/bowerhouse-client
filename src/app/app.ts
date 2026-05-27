import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BowerHouseSession,
  Card,
  GameState,
  RoomState,
  RoomSummary,
  SocketService,
  SUITS,
  Suit,
} from './services/socket.service';
import { RoomReaction } from './services/socket.service';
import { ConnectionBannersComponent } from './components/connection-banners/connection-banners';
import { CreateGameModalComponent } from './components/create-game-modal/create-game-modal';
import { FeedbackLayerComponent } from './components/feedback-layer/feedback-layer';
import { GamePanel, GamePanelsComponent } from './components/game-panels/game-panels';
import { GameViewComponent } from './components/game-view/game-view';
import { HeroHeaderComponent } from './components/hero-header/hero-header';
import { HomeViewComponent } from './components/home-view/home-view';
import { JoinPrivateModalComponent } from './components/join-private-modal/join-private-modal';
import { RoomLobbyComponent } from './components/room-lobby/room-lobby';
import { RulesModalComponent } from './components/rules-modal/rules-modal';
import { SettingsModalComponent } from './components/settings-modal/settings-modal';
import { suitSymbol as getSuitSymbol } from './game/game-utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ConnectionBannersComponent,
    CreateGameModalComponent,
    FeedbackLayerComponent,
    GamePanelsComponent,
    GameViewComponent,
    HeroHeaderComponent,
    HomeViewComponent,
    JoinPrivateModalComponent,
    RoomLobbyComponent,
    RulesModalComponent,
    SettingsModalComponent,
  ],
  templateUrl: './app.html',
  styleUrls: [
    './styles/base.css',
    './styles/top-actions.css',
    './styles/lobby.css',
    './styles/game-layout.css',
    './styles/game-actions.css',
    './styles/table-board.css',
    './styles/table-hand.css',
    './styles/brand-rules.css',
    './styles/game-feedback.css',
    './styles/motion-overlays.css',
    './styles/two-player.css',
    './styles/polish.css',
  ],
  encapsulation: ViewEncapsulation.None,
})
export class App implements OnInit, OnDestroy {
  isIos = false;
  isStandalone = false;
  playerName = '';
  tableName = '';
  privatePassword = '';
  joinRoomCode = '';
  joinPassword = '';
  timerSeconds = 25;
  suits = SUITS;
  showRules = false;
  connectionStatus = 'Connecting';
  lastNotifiedTurnKey = '';
  lastNotifiedAutoActionKey = '';
  lastShownAutoActionKey = '';
  hapticsEnabled = true;
  showSettings = false;
  showTableLog = true;
  activeGamePanel: GamePanel | null = null;
  reactions = ['Nice!', 'Oof', 'Good luck', 'Wow', 'Close one'];
  latestReaction: RoomReaction | null = null;
  deferredInstallPrompt: any = null;
  canInstall = false;
  isSocketConnected = true;
  reconnectAttempting = false;
  stickTheDealer = false;
  canadianLoner = false;
  now = Date.now();
  timerInterval: ReturnType<typeof setInterval> | null = null;

  publicRooms: RoomSummary[] = [];
  currentRoom: RoomState | null = null;
  currentGame: GameState | null = null;
  currentSession: BowerHouseSession | null = null;
  messageTimeout: ReturnType<typeof setTimeout> | null = null;
  autoActionTimeout: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  selectedMode: 'four-player' | 'two-player' = 'four-player';

  showCreateGame = false;
  showJoinPrivate = false;

  errorMessage = '';
  successMessage = '';
  autoActionMessage = '';
  actionPending = false;

  constructor(
    public socketService: SocketService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnDestroy() {
    this.destroyed = true;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }

    if (this.autoActionTimeout) {
      clearTimeout(this.autoActionTimeout);
      this.autoActionTimeout = null;
    }
  }

  ngOnInit() {
    this.loadSavedName();
    this.hapticsEnabled = localStorage.getItem('bowerhouseHaptics') !== 'off';
    this.showTableLog = localStorage.getItem('bowerhouseShowTableLog') !== 'off';
    this.isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    this.isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredInstallPrompt = event;
      this.canInstall = true;
    });

    this.socketService.onRoomDeleted((payload) => {
      if (this.currentRoom?.id !== payload.roomId) {
        return;
      }

      this.currentRoom = null;
      this.currentGame = null;
      this.currentSession = null;
      localStorage.removeItem('bowerhouseSession');
      this.setErrorMessage(payload.reason || 'Room closed.');
      this.socketService.listPublicRooms();
      this.renderNow();
    });

    this.socketService.onConnect(() => {
      this.connectionStatus = 'Connected';
      this.isSocketConnected = true;
      this.reconnectAttempting = false;
      this.tryAutoReconnect();
      this.socketService.listPublicRooms();
      this.renderNow();
    });

    this.socketService.onDisconnect(() => {
      this.connectionStatus = 'Disconnected';
      this.isSocketConnected = false;

      if (this.currentSession) {
        this.reconnectAttempting = true;
      }

      this.renderNow();
    });

    this.socketService.onServerError((payload) => {
      this.setErrorMessage(payload.error || 'Server error.');
      this.renderNow();
    });

    this.socketService.onReconnectAttempt(() => {
      this.reconnectAttempting = true;
      this.renderNow();
    });

    this.socketService.onReconnect(() => {
      this.connectionStatus = 'Reconnected';
      this.isSocketConnected = true;
      this.reconnectAttempting = false;
      this.tryAutoReconnect();
      this.socketService.listPublicRooms();
      this.renderNow();
    });

    this.socketService.onReaction((reaction) => {
      this.latestReaction = reaction;
      this.renderNow();

      setTimeout(() => {
        if (this.latestReaction?.createdAt === reaction.createdAt) {
          this.latestReaction = null;
          this.renderNow();
        }
      }, 2500);
    });

    this.socketService.onPublicRoomsUpdate((rooms) => {
      this.publicRooms = rooms;
      this.renderNow();
    });

    this.socketService.onRoomUpdate((room) => {
      if (this.currentRoom?.id === room.id) {
        this.currentRoom = room;
        this.renderNow();
      }
    });

    this.socketService.onGameUpdate((game) => {
      this.currentGame = game;

      if (
        !game ||
        (this.activeGamePanel === 'last-trick' && !game.completedTricks.length) ||
        (this.activeGamePanel === 'log' && !game.activityLog.length)
      ) {
        this.closeGamePanel();
      }

      this.handleMobileFeedback(game);
      this.showAutoActionToast(game);
      this.renderNow();
    });

    this.socketService.connect();

    this.timerInterval = setInterval(() => {
      this.now = Date.now();
      this.renderNow();
    }, 250);
  }

  get turnSecondsRemaining() {
    if (!this.currentGame || this.currentGame.activeSeat === null) {
      return 0;
    }

    const elapsed = this.now - this.currentGame.turnStartedAt;
    const limit = (this.currentRoom?.timerSeconds || 25) * 1000;
    const remaining = Math.ceil((limit - elapsed) / 1000);

    return Math.max(0, remaining);
  }

  get turnPercentRemaining() {
    if (!this.currentGame || this.currentGame.activeSeat === null) {
      return 0;
    }

    const elapsed = this.now - this.currentGame.turnStartedAt;
    const limit = (this.currentRoom?.timerSeconds || 25) * 1000;
    const remainingRatio = Math.max(0, Math.min(1, 1 - elapsed / limit));

    return Math.round(remainingRatio * 100);
  }

  get nextHandSecondsRemaining() {
    if (this.currentGame?.phase !== 'hand-complete') {
      return 0;
    }

    const completedAt = this.currentGame.handCompletedAt || this.currentGame.turnStartedAt;
    const remaining = Math.ceil((10000 - (this.now - completedAt)) / 1000);

    return Math.max(0, remaining);
  }

  get showIosInstallHint() {
    return this.isIos && !this.isStandalone;
  }

  get gameStatusMessage() {
    if (!this.currentRoom) {
      return '';
    }

    if (!this.currentGame) {
      const remainingSeats = this.currentRoom.maxPlayers - this.currentRoom.players.length;

      return remainingSeats > 0
        ? `Waiting for ${remainingSeats} more ${remainingSeats === 1 ? 'player' : 'players'}.`
        : 'Ready to start.';
    }

    if (this.currentGame.phase === 'ordering-up') {
      return this.isMyTurn
        ? 'Your turn: order up or pass.'
        : `${this.playerNameForSeat(this.currentGame.activeSeat)} is deciding whether to order up.`;
    }

    if (this.currentGame.phase === 'dealer-discard') {
      return this.isMyTurn
        ? 'You are the dealer. Discard one card.'
        : `Waiting for ${this.playerNameForSeat(this.currentGame.dealerSeat)} to discard.`;
    }

    if (this.currentGame.phase === 'naming-trump') {
      return this.isMyTurn
        ? 'Your turn: name trump or pass.'
        : `${this.playerNameForSeat(this.currentGame.activeSeat)} is choosing trump.`;
    }

    if (this.currentGame.phase === 'playing') {
      return this.isMyTurn
        ? 'Your turn: play a card.'
        : `${this.playerNameForSeat(this.currentGame.activeSeat)} is playing a card.`;
    }

    if (this.currentGame.phase === 'hand-complete') {
      return 'Hand complete.';
    }

    if (this.currentGame.phase === 'game-over') {
      return `Game over. ${this.resultSideLabel(this.currentGame.winningTeam!)} wins.`;
    }

    return '';
  }

  get canCreateGame() {
    return this.playerName.trim().length > 0;
  }

  get availableTrumpSuits() {
    if (!this.currentGame) {
      return [];
    }

    if (!this.currentGame.upCard) {
      return [...this.suits];
    }

    return this.suits.filter((suit) => suit !== this.currentGame!.upCard!.suit);
  }

  get canJoinPrivateGame() {
    return (
      this.playerName.trim().length > 0 &&
      this.joinRoomCode.trim().length > 0 &&
      this.joinPassword.trim().length > 0
    );
  }

  get isTwoPlayerDealerTurn() {
    return (
      this.currentGame?.mode === 'two-player' &&
      this.currentGame.activeSeat === this.currentGame.dealerSeat
    );
  }

  get createGamePrivacyLabel() {
    return this.privatePassword.trim() ? 'Private table' : 'Public table';
  }

  get isMyTurn() {
    return this.currentGame?.activeSeat === this.currentSession?.seat;
  }

  get isHost() {
    if (!this.currentRoom || !this.currentSession) {
      return false;
    }

    const player = this.currentRoom.players.find(
      (roomPlayer) => roomPlayer.seat === this.currentSession?.seat,
    );

    return Boolean(player?.isHost);
  }

  get canStartGame() {
    return (
      this.isHost &&
      this.currentRoom?.status === 'waiting' &&
      this.currentRoom.players.length === this.currentRoom.maxPlayers
    );
  }

  get mySeatLabel() {
    if (!this.currentSession) {
      return '';
    }

    return `Seat ${this.currentSession.seat + 1}`;
  }

  get actionRevision() {
    return this.currentGame?.actionRevision || 0;
  }

  async rematch() {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.rematch(this.currentSession!, this.actionRevision),
      'Unable to start rematch.',
    );

    if (!this.errorMessage) {
      this.setSuccessMessage('Rematch started.');
    }
  }

  async twoPlayerNameTrump(suit: Suit) {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.twoPlayerNameTrump(this.currentSession!, suit, this.actionRevision),
      'Unable to name trump.',
    );
  }

  async twoPlayerPassNaming() {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.twoPlayerPassNaming(this.currentSession!, this.actionRevision),
      'Unable to pass.',
    );
  }

  async twoPlayerPlayHandCard(card: Card) {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () =>
        this.socketService.twoPlayerPlayCard(
          this.currentSession!,
          {
            source: 'hand',
            cardId: card.id,
          },
          this.actionRevision,
        ),
      'Unable to play card.',
    );
  }

  async twoPlayerPlayTableCard(card: Card, slotIndex: number) {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () =>
        this.socketService.twoPlayerPlayCard(
          this.currentSession!,
          {
            source: 'table',
            cardId: card.id,
            slotIndex,
          },
          this.actionRevision,
        ),
      'Unable to play table card.',
    );
  }

  normalizeTimer() {
    this.timerSeconds = Math.min(90, Math.max(10, Number(this.timerSeconds) || 25));
  }

  normalizeRoomCode(value: string) {
    return value.trim().toUpperCase();
  }

  sidePlayerNames(index: number) {
    if (this.currentGame?.mode === 'two-player') {
      return this.playerNameForSeat(index);
    }

    const seats = index === 0 ? [0, 2] : [1, 3];

    return seats.map((seat) => this.playerNameForSeat(seat)).join(' / ');
  }

  resultSideLabel(index: number) {
    return this.sidePlayerNames(index);
  }

  async runAction(action: () => Promise<{ ok: boolean; error?: string }>, fallbackError: string) {
    if (this.actionPending) {
      return;
    }

    this.actionPending = true;
    this.clearMessages();

    try {
      const result = await action();

      if (!result.ok) {
        this.setErrorMessage(result.error || fallbackError);
      }
    } finally {
      this.actionPending = false;
      this.renderNow();
    }
  }

  toggleGamePanel(panel: GamePanel) {
    this.activeGamePanel = this.activeGamePanel === panel ? null : panel;
  }

  closeGamePanel() {
    this.activeGamePanel = null;
  }

  openSettings() {
    this.closeGamePanel();
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  toggleHaptics() {
    this.hapticsEnabled = !this.hapticsEnabled;
    localStorage.setItem('bowerhouseHaptics', this.hapticsEnabled ? 'on' : 'off');
    this.setSuccessMessage(this.hapticsEnabled ? 'Haptics enabled.' : 'Haptics disabled.');
  }

  toggleTableLog() {
    this.showTableLog = !this.showTableLog;
    localStorage.setItem('bowerhouseShowTableLog', this.showTableLog ? 'on' : 'off');
    this.setSuccessMessage(this.showTableLog ? 'Table log shown.' : 'Table log hidden.');
  }

  handleMobileFeedback(game: GameState | null) {
    if (!game || !this.currentSession || !this.hapticsEnabled) {
      return;
    }

    const canVibrate = 'vibrate' in navigator;

    if (!canVibrate) {
      return;
    }

    const turnKey = `${game.phase}-${game.activeSeat}-${game.turnStartedAt}`;

    if (game.activeSeat === this.currentSession.seat && turnKey !== this.lastNotifiedTurnKey) {
      navigator.vibrate(60);
      this.lastNotifiedTurnKey = turnKey;
    }

    if (game.lastAutoAction) {
      const autoKey = `${game.lastAutoAction.type}-${game.lastAutoAction.createdAt}`;

      if (autoKey !== this.lastNotifiedAutoActionKey) {
        navigator.vibrate([30, 40, 30]);
        this.lastNotifiedAutoActionKey = autoKey;
      }
    }
  }

  showAutoActionToast(game: GameState | null) {
    if (!game?.lastAutoAction) {
      return;
    }

    const autoKey = `${game.lastAutoAction.type}-${game.lastAutoAction.createdAt}`;

    if (autoKey === this.lastShownAutoActionKey) {
      return;
    }

    this.lastShownAutoActionKey = autoKey;
    this.autoActionMessage = this.displaySeatMessage(game.lastAutoAction.message);

    if (this.autoActionTimeout) {
      clearTimeout(this.autoActionTimeout);
    }

    this.autoActionTimeout = setTimeout(() => {
      if (this.destroyed || this.lastShownAutoActionKey !== autoKey) {
        return;
      }

      this.autoActionMessage = '';
      this.autoActionTimeout = null;
      this.renderNow();
    }, 3000);
  }

  openRules() {
    this.closeGamePanel();
    this.showRules = true;
  }

  closeRules() {
    this.showRules = false;
  }

  saveName(value: string) {
    this.playerName = value;
    localStorage.setItem('bowerhouseName', this.playerName);
  }

  openCreateGame() {
    this.clearMessages();

    if (!this.validatePlayerName()) {
      return;
    }

    this.showCreateGame = true;
  }

  openJoinPrivate() {
    this.clearMessages();

    if (!this.validatePlayerName()) {
      return;
    }

    this.showJoinPrivate = true;
  }

  closeModals() {
    this.showCreateGame = false;
    this.showJoinPrivate = false;
  }

  async sendReaction(message: string) {
    if (!this.currentSession) {
      return;
    }

    const result = await this.socketService.sendReaction(this.currentSession, message);

    if (!result.ok) {
      this.setErrorMessage(result.error || 'Unable to send reaction.');
    }
  }

  validatePlayerName() {
    const name = this.playerName.trim();

    if (!name) {
      this.setErrorMessage('Choose a name first.');
      return false;
    }

    if (name.length > 18) {
      this.setErrorMessage('Name must be 18 characters or less.');
      return false;
    }

    return true;
  }

  ruleSummary(room = this.currentRoom) {
    if (!room?.rules) {
      return 'Standard rules';
    }

    const enabled = [];

    if (room.rules.stickTheDealer) {
      enabled.push('Stick the Dealer');
    }

    if (room.mode === 'four-player' && room.rules.canadianLoner) {
      enabled.push('Canadian Loner');
    }

    return enabled.length ? enabled.join(' · ') : 'Standard rules';
  }

  get canDealerPassNaming() {
    return (
      this.currentGame?.phase === 'naming-trump' &&
      this.isMyTurn &&
      this.currentGame.activeSeat === this.currentGame.dealerSeat &&
      !this.currentGame.rules?.stickTheDealer
    );
  }

  async createGame() {
    if (!this.validatePlayerName()) {
      return;
    }

    if (this.tableName.trim().length > 32) {
      this.setErrorMessage('Table name must be 32 characters or less.');
      return;
    }

    if (this.privatePassword.trim().length > 32) {
      this.setErrorMessage('Password must be 32 characters or less.');
      return;
    }
    this.clearMessages();

    if (!this.canCreateGame) {
      this.setErrorMessage('Choose a name first.');
      return;
    }

    const result = await this.socketService.createRoom({
      hostName: this.playerName,
      tableName: this.tableName,
      password: this.privatePassword,
      timerSeconds: Math.min(90, Math.max(10, Number(this.timerSeconds) || 25)),
      mode: this.selectedMode,
      stickTheDealer: this.stickTheDealer,
      canadianLoner: this.selectedMode === 'four-player' && this.canadianLoner,
    });

    if (!result.ok || !result.room || !result.session) {
      this.setErrorMessage(result.error || 'Unable to create game.');
      this.renderNow();
      return;
    }

    this.setSession(result.session);
    this.currentRoom = result.room;
    this.closeModals();
    this.setSuccessMessage('Game created.');
    this.renderNow();
  }

  async joinPublicRoom(room: RoomSummary) {
    if (!this.validatePlayerName()) {
      return;
    }
    this.clearMessages();

    if (!this.playerName.trim()) {
      this.setErrorMessage('Choose a name first.');
      return;
    }

    const result = await this.socketService.joinPublicRoom({
      roomId: room.id,
      name: this.playerName,
    });

    if (!result.ok || !result.room || !result.session) {
      this.setErrorMessage(result.error || 'Unable to join public game.');
      this.renderNow();
      return;
    }

    this.setSession(result.session);
    this.currentRoom = result.room;
    this.setSuccessMessage('Joined public game.');
    this.renderNow();
  }

  async joinPrivateGame() {
    if (!this.validatePlayerName()) {
      return;
    }

    if (!this.joinRoomCode.trim()) {
      this.setErrorMessage('Enter a room code.');
      return;
    }

    if (!this.joinPassword.trim()) {
      this.setErrorMessage('Enter the private table password.');
      return;
    }

    if (this.joinPassword.trim().length > 32) {
      this.setErrorMessage('Password must be 32 characters or less.');
      return;
    }
    this.clearMessages();

    if (!this.canJoinPrivateGame) {
      this.setErrorMessage('Enter your name, room code, and password.');
      return;
    }

    const result = await this.socketService.joinPrivateRoom({
      roomId: this.normalizeRoomCode(this.joinRoomCode),
      name: this.playerName,
      password: this.joinPassword,
    });

    if (!result.ok || !result.room || !result.session) {
      this.setErrorMessage(result.error || 'Unable to join private game.');
      this.renderNow();
      return;
    }

    this.setSession(result.session);
    this.currentRoom = result.room;
    this.closeModals();
    this.setSuccessMessage('Joined private game.');
    this.renderNow();
  }

  async startGame() {
    this.clearMessages();

    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    const result = await this.socketService.startGame(this.currentSession);

    if (!result.ok) {
      this.setErrorMessage(result.error || 'Unable to start game.');
      return;
    }

    this.setSuccessMessage('Game started.');
  }

  async tryAutoReconnect() {
    const rawSession = localStorage.getItem('bowerhouseSession');

    if (!rawSession) {
      return;
    }

    try {
      const session = JSON.parse(rawSession) as BowerHouseSession;

      const result = await this.socketService.resumeSession(session);

      if (!result.ok || !result.room || !result.session) {
        localStorage.removeItem('bowerhouseSession');
        return;
      }

      this.currentSession = result.session;
      this.currentRoom = result.room;
      localStorage.setItem('bowerhouseSession', JSON.stringify(result.session));
      this.setSuccessMessage('Reconnected to your game.');
      this.renderNow();
    } catch {
      localStorage.removeItem('bowerhouseSession');
    }
  }

  async leaveLocalRoom() {
    this.clearMessages();

    if (this.currentSession && this.currentRoom?.status === 'waiting') {
      const result = await this.socketService.leaveRoom(this.currentSession);

      if (!result.ok) {
        this.setErrorMessage(result.error || 'Unable to leave table.');
        this.renderNow();
        return;
      }
    }

    this.currentRoom = null;
    this.currentGame = null;
    this.currentSession = null;
    localStorage.removeItem('bowerhouseSession');
    this.socketService.listPublicRooms();
    this.renderNow();
  }

  copyRoomCode() {
    if (!this.currentRoom) {
      return;
    }

    this.copyText(this.currentRoom.id, 'Room code copied.');
  }

  async copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);

      this.setSuccessMessage(successMessage);
    } catch {
      this.setErrorMessage('Unable to copy. Select and copy manually.');
    }
  }

  suitSymbol(suit: string | null | undefined) {
    return getSuitSymbol(suit);
  }

  async orderUp() {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.orderUp(this.currentSession!, this.actionRevision),
      'Unable to order up.',
    );
  }

  async passOrdering() {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.passOrdering(this.currentSession!, this.actionRevision),
      'Unable to pass.',
    );
  }

  async discardCard(card: Card) {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.dealerDiscard(this.currentSession!, card.id, this.actionRevision),
      'Unable to discard.',
    );
  }

  async nameTrump(suit: Suit) {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.nameTrump(this.currentSession!, suit, this.actionRevision),
      'Unable to name trump.',
    );
  }

  async passNaming() {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.passNaming(this.currentSession!, this.actionRevision),
      'Unable to pass.',
    );
  }

  async playCard(card: Card) {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.playCard(this.currentSession!, card.id, this.actionRevision),
      'Unable to play card.',
    );
  }

  async nextHand() {
    if (!this.currentSession) {
      this.setErrorMessage('Session not found.');
      return;
    }

    await this.runAction(
      () => this.socketService.nextHand(this.currentSession!, this.actionRevision),
      'Unable to start next hand.',
    );
  }

  get inviteText() {
    if (!this.currentRoom) {
      return '';
    }

    const privacy = this.currentRoom.isPrivate
      ? 'This is a private table. Use the password I gave you.'
      : 'This is a public table.';

    return `Join my BowerHouse euchre table.\nRoom Code: ${this.currentRoom.id}\n${privacy}`;
  }

  get createFormReady() {
    return this.playerName.trim().length > 0;
  }

  get joinPrivateFormReady() {
    return (
      this.playerName.trim().length > 0 &&
      this.joinRoomCode.trim().length === 6 &&
      this.joinPassword.trim().length > 0
    );
  }

  playerNameForSeat(seat: number | null | undefined) {
    if (seat === null || seat === undefined) {
      return 'None';
    }

    return (
      this.currentRoom?.players.find((player) => player.seat === seat)?.name || `Seat ${seat + 1}`
    );
  }

  displaySeatMessage(message: string) {
    return message.replace(/\b[Ss]eat (\d+)\b/g, (_match, seatNumber: string) =>
      this.playerNameForSeat(Number(seatNumber) - 1),
    );
  }

  copyInviteText() {
    if (!this.currentRoom) {
      return;
    }

    this.copyText(this.inviteText, 'Invite copied.');
  }

  returnHome() {
    this.currentRoom = null;
    this.currentGame = null;
    this.currentSession = null;
    this.showCreateGame = false;
    this.showJoinPrivate = false;
    this.setErrorMessage('');
    this.setSuccessMessage('');
    localStorage.removeItem('bowerhouseSession');
    this.socketService.listPublicRooms();
  }

  private renderNow() {
    if (this.destroyed) {
      return;
    }

    this.changeDetector.detectChanges();
  }

  async installApp() {
    if (!this.deferredInstallPrompt) {
      return;
    }

    this.deferredInstallPrompt.prompt();

    await this.deferredInstallPrompt.userChoice;

    this.deferredInstallPrompt = null;
    this.canInstall = false;
  }

  private setSession(session: BowerHouseSession) {
    this.currentSession = session;
    localStorage.setItem('bowerhouseSession', JSON.stringify(session));
  }

  private loadSavedName() {
    this.playerName = localStorage.getItem('bowerhouseName') || '';
  }

  private clearMessages() {
    this.clearMessageTimeout();
    this.errorMessage = '';
    this.successMessage = '';
  }

  private clearMessageTimeout() {
    if (!this.messageTimeout) {
      return;
    }

    clearTimeout(this.messageTimeout);
    this.messageTimeout = null;
  }

  setSuccessMessage(message: string) {
    this.clearMessageTimeout();
    this.errorMessage = '';
    this.successMessage = message;

    if (!message) {
      return;
    }

    this.messageTimeout = setTimeout(() => {
      this.successMessage = '';
      this.messageTimeout = null;
      this.renderNow();
    }, 2500);
  }

  setErrorMessage(message: string) {
    this.clearMessageTimeout();
    this.successMessage = '';
    this.errorMessage = message;

    if (!message) {
      return;
    }

    this.messageTimeout = setTimeout(() => {
      this.errorMessage = '';
      this.messageTimeout = null;
      this.renderNow();
    }, 3500);
  }
}
