import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaceCard } from '../place-card/place-card';
import { PlaceResult } from '../../services/places.service';

@Component({
  selector: 'app-place-list',
  standalone: true,
  imports: [CommonModule, PlaceCard],
  templateUrl: './place-list.html',
  styleUrl: './place-list.css'
})
export class PlaceList {
  @Input() places: PlaceResult[] = [];
  @Input() isLoading: boolean = false;
  @Input() hasSearched: boolean = false;
  @Input() error: string | null = null;
}
