import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterState {
  openNow: boolean;
  minRating: number;
  priceLevel: number | null; // 0-4 or null for any
  sortBy: 'distance' | 'rating';
}

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.html',
  styleUrl: './filters.css'
})
export class Filters {
  @Input() showPriceFilter: boolean = false;
  @Output() filterChange = new EventEmitter<FilterState>();

  filters: FilterState = {
    openNow: false,
    minRating: 0,  // No rating filter by default
    priceLevel: null,
    sortBy: 'distance'
  };

  onFilterChange() {
    this.filterChange.emit(this.filters);
  }
}
