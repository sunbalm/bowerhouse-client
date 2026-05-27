import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface ScorePanelItem {
  label: string;
  score: number;
}

@Component({
  selector: 'app-score-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './score-panel.html',
})
export class ScorePanelComponent {
  @Input() items: ScorePanelItem[] = [];

  scorePercent(score: number) {
    return Math.max(0, Math.min(100, score * 10));
  }
}
