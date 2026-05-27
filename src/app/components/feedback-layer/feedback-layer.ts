import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RoomReaction } from '../../services/socket.service';

@Component({
  selector: 'app-feedback-layer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback-layer.html',
})
export class FeedbackLayerComponent {
  @Input() errorMessage = '';
  @Input() successMessage = '';
  @Input() connectionStatus = 'Connecting';
  @Input() latestReaction: RoomReaction | null = null;
  @Input() autoActionMessage = '';
}
