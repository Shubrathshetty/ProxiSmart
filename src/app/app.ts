import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
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
  userLocation: { lat: number, lng: number, accuracy?: number } | null = null;
  locationError: string | null = null;

  selectedMood: Mood | null = null;
  allPlaces: PlaceResult[] = [];
  displayedPlaces: PlaceResult[] = [];

  isLoading: boolean = false;
  searchError: string | null = null;
  isInitializing: boolean = false;  // Show app immediately

  showPriceFilter: boolean = false;
  currentFilters: FilterState = {
    openNow: false,
    minRating: 0,  // No rating filter by default
    priceLevel: null,
    sortBy: 'distance'
  };

  constructor(
    private locationService: LocationService,
    private placesService: PlacesService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.initializeApp();
  }

  private initializeApp() {
    // Just try to get location in the background - don't block UI
    this.locationService.getCurrentPosition()
      .then((coords: any) => {
        this.userLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy
        };
      })
      .catch(err => {
        console.error('Location error', err);
        this.locationError = 'Could not get your location. Please use manual location below.';
      });
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

    // Reset filters to default on new search
    this.currentFilters = {
      openNow: false,
      minRating: 0,
      priceLevel: null,
      sortBy: 'distance'
    };

    // Also reset the child component via a hack or just rely on manual update?
    // We can't easily reset child component state without ViewChild.
    // For now, let's just update our local state and hope user adjusts if needed.
    // Ideally we should bind [filters] input to child.

    this.placesService.searchNearby(this.userLocation, mood)
      .then(results => {
        this.ngZone.run(() => {
          console.log('Results received:', results.length);
          // Force next tick to ensure clean render
          setTimeout(() => {
            this.allPlaces = results;
            this.applyFilters();
            this.isLoading = false;
            this.cdr.detectChanges();
          }, 0);
        });
      })
      .catch(err => {
        this.ngZone.run(() => {
          console.error(err);
          this.searchError = 'Failed to find places. Please check the API Key or try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      });
  }

  onFiltersChanged(filters: FilterState) {
    this.currentFilters = filters;
    this.applyFilters();
  }

  applyFilters() {
    let temp = [...this.allPlaces];

    console.log('Filtering places:', this.allPlaces.length, 'Filter:', this.currentFilters);

    // Debug: Check a few places
    if (this.allPlaces.length > 0) {
      console.log('Sample place:', this.allPlaces[0]);
    }

    if (this.currentFilters.openNow) {
      temp = temp.filter(p => p.isOpen === true);
    }

    if (this.currentFilters.minRating && this.currentFilters.minRating > 0) {
      temp = temp.filter(p => (p.rating || 0) >= this.currentFilters.minRating);
    }

    // ... rest of filters ...

    if (this.currentFilters.priceLevel !== null && this.showPriceFilter) {
      temp = temp.filter(p => p.priceLevel === this.currentFilters.priceLevel);
    }

    if (this.currentFilters.sortBy === 'distance') {
      temp.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (this.currentFilters.sortBy === 'rating') {
      temp.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    this.displayedPlaces = temp;
    console.log('Displayed places:', this.displayedPlaces.length);
    this.cdr.detectChanges();  // Force UI update
  }

  editLocation() {
    // Preserve current location in inputs if we bound them, but for now just clear
    this.userLocation = null;
    this.locationError = 'Please enter your specific location manually.';
  }

  retryLocation() {
    this.isLoading = true;
    this.locationError = null;

    this.locationService.getCurrentPosition()
      .then((coords: any) => {
        this.userLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy
        };
        this.isLoading = false;
      })
      .catch(err => {
        console.error('Location retry error', err);
        this.locationError = 'Could not get your location. Please use manual location below.';
        this.isLoading = false;
      });
  }

  setLocationByAddress(address: string) {
    if (!address) return;

    this.isLoading = true;
    this.locationError = null;

    this.placesService.geocode(address)
      .then(coords => {
        this.userLocation = {
          lat: coords.lat,
          lng: coords.lng,
          accuracy: 0 // Manual/Geocoded is considered precise
        };
        this.isLoading = false;
      })
      .catch(err => {
        console.error('Geocoding error', err);
        this.locationError = 'Could not find that location. Please try a different address.';
        this.isLoading = false;
      });
  }
}
