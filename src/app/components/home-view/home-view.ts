import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RoomSummary } from '../../services/socket.service';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-view.html',
})
export class HomeViewComponent {
  @Input() playerName = '';
  @Input() publicRooms: RoomSummary[] = [];

  @Output() playerNameChange = new EventEmitter<string>();
  @Output() createGameRequested = new EventEmitter<void>();
  @Output() joinPrivateRequested = new EventEmitter<void>();
  @Output() publicRoomSelected = new EventEmitter<RoomSummary>();

  get hasPlayerName() {
    return this.playerName.trim().length > 0;
  }
}
