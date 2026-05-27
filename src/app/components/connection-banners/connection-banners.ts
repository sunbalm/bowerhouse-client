import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-connection-banners',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connection-banners.html',
})
export class ConnectionBannersComponent {
  @Input() reconnectAttempting = false;
  @Input() isSocketConnected = true;
}
