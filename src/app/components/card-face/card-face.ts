import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Card } from '../../services/socket.service';
import { suitSymbol } from '../../game/game-utils';

@Component({
  selector: 'app-card-face',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-face.html',
})
export class CardFaceComponent {
  @Input() card: Card | null = null;

  suitSymbol = suitSymbol;
}
