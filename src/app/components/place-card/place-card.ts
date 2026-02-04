import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaceResult } from '../../services/places.service';

@Component({
  selector: 'app-place-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './place-card.html',
  styleUrl: './place-card.css'
})
export class PlaceCard {
  @Input() place!: PlaceResult;

  openInMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${this.place.location.lat},${this.place.location.lng}&query_place_id=${this.place.placeId}`;
    window.open(url, '_blank');
  }

  get priceString(): string {
    if (!this.place.priceLevel) return '';
    return '$'.repeat(this.place.priceLevel);
  }
}
