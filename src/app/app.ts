import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoodSelector } from './components/mood-selector/mood-selector';
import { Filters, FilterState } from './components/filters/filters';
import { PlaceList } from './components/place-list/place-list';
import { LocationService } from './services/location.service';
import { PlacesService, PlaceResult } from './services/places.service';
import { Mood } from './services/mood.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MoodSelector, Filters, PlaceList],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  userLocation: { lat: number, lng: number } | null = null;
  locationError: string | null = null;

  selectedMood: Mood | null = null;
  allPlaces: PlaceResult[] = [];
  displayedPlaces: PlaceResult[] = [];

  isLoading: boolean = false;
  searchError: string | null = null;
  isInitializing: boolean = true;

  showPriceFilter: boolean = false;
  currentFilters: FilterState = {
    openNow: false,
    minRating: 3.5,
    priceLevel: null,
    sortBy: 'distance'
  };

  constructor(
    private locationService: LocationService,
    private placesService: PlacesService
  ) { }

  ngOnInit() {
    this.initializeApp();
  }

  private async initializeApp() {
    try {
      // Wait for Google Maps API to load
      await (window as any).googleMapsReady;

      // Then get location
      const coords = await this.locationService.getCurrentPosition();
      this.userLocation = coords;
    } catch (err) {
      console.error('Initialization error', err);
      this.locationError = 'Could not get your location. Please enable location services.';
    } finally {
      this.isInitializing = false;
    }
  }

  onMoodSelected(mood: Mood) {
    if (!this.userLocation) {
      alert('We need your location to find places!');
      return;
    }

    this.selectedMood = mood;
    this.showPriceFilter = mood.id === 'budget';
    this.isLoading = true;
    this.searchError = null;
    this.allPlaces = [];
    this.displayedPlaces = [];

    // Reset filters partially or keep them? 
    // Requirement filters applied AFTER response.
    // Keeping current filters is fine.

    this.placesService.searchNearby(this.userLocation, mood)
      .then(results => {
        this.allPlaces = results;
        this.applyFilters();
        this.isLoading = false;
      })
      .catch(err => {
        console.error(err);
        this.searchError = 'Failed to find places. Please check the API Key or try again.';
        this.isLoading = false;
      });
  }

  onFiltersChanged(filters: FilterState) {
    this.currentFilters = filters;
    this.applyFilters();
  }

  applyFilters() {
    let temp = [...this.allPlaces];

    if (this.currentFilters.openNow) {
      temp = temp.filter(p => p.isOpen === true);
    }

    if (this.currentFilters.minRating) {
      temp = temp.filter(p => (p.rating || 0) >= this.currentFilters.minRating);
    }

    if (this.currentFilters.priceLevel !== null && this.showPriceFilter) {
      temp = temp.filter(p => p.priceLevel === this.currentFilters.priceLevel);
    }

    if (this.currentFilters.sortBy === 'distance') {
      temp.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (this.currentFilters.sortBy === 'rating') {
      temp.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    this.displayedPlaces = temp;
  }

  setManualLocation(latStr: string, lngStr: string) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      this.userLocation = { lat, lng };
      this.locationError = null;
      this.locationService.setManualLocation(lat, lng);
    }
  }
}
