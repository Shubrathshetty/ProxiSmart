import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoodSelector } from './components/mood-selector/mood-selector';
import { Filters, FilterState } from './components/filters/filters';
import { PlaceList } from './components/place-list/place-list';
import { LocationService } from './services/location.service';
import { PlacesService, PlaceResult } from './services/places.service';
import { Mood } from './services/mood.service';
import { PlannerService, PlannerContext, ItineraryPlan, PlanStep } from './services/planner.service';
import { Itinerary, StepResult } from './components/itinerary/itinerary';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MoodSelector, Filters, PlaceList, Itinerary],
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

  // Planner State
  currentPlan: ItineraryPlan | null = null;
  itinerarySteps: StepResult[] = [];
  rawStepResults: Map<number, PlaceResult[]> = new Map(); // Store raw for filtering

  context: PlannerContext = {
    timeOfDay: 'evening', // Default for now, could detect
    company: 'date'       // Default
  };

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
    private plannerService: PlannerService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.initializeApp();
  }

  debugGeo: string = '';

  private initializeApp() {
    // Just try to get location in the background - don't block UI
    this.locationService.getCurrentPosition()
      .then((coords: any) => {
        this.userLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy
        };
        this.debugGeo = `Lat: ${coords.latitude}, Lng: ${coords.longitude}, Acc: ${coords.accuracy}m`;
        console.log('Location success:', this.debugGeo);
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

    // Generate Plan
    this.currentPlan = this.plannerService.generatePlan(mood, this.context);
    console.log('Generated Plan:', this.currentPlan);

    // Reset Steps
    this.itinerarySteps = this.currentPlan.steps.map(step => ({
      step,
      places: [],
      isLoading: true,
      error: undefined
    }));
    this.rawStepResults.clear();
    this.cdr.detectChanges();

    // Fetch places for each step
    this.currentPlan.steps.forEach((step, index) => {
      this.placesService.searchByType(this.userLocation!, step.searchType, step.searchKeyword)
        .then(results => {
          this.ngZone.run(() => {
            this.rawStepResults.set(index, results);
            this.filterStep(index);
          });
        })
        .catch(err => {
          this.ngZone.run(() => {
            console.error(`Error for step ${index}`, err);
            this.itinerarySteps[index].isLoading = false;
            this.itinerarySteps[index].error = 'Could not find places.';
            this.cdr.detectChanges();
          });
        });
    });
  }

  filterItinerary() {
    this.itinerarySteps.forEach((_, index) => this.filterStep(index));
  }

  filterStep(index: number) {
    const raw = this.rawStepResults.get(index) || [];
    let temp = [...raw];

    if (this.currentFilters.openNow) {
      temp = temp.filter(p => p.isOpen === true);
    }
    if (this.currentFilters.minRating && this.currentFilters.minRating > 0) {
      temp = temp.filter(p => (p.rating || 0) >= this.currentFilters.minRating);
    }
    if (this.currentFilters.priceLevel !== null && this.showPriceFilter) {
      temp = temp.filter(p => p.priceLevel === this.currentFilters.priceLevel);
    }
    // Sort logic 
    if (this.currentFilters.sortBy === 'distance') {
      temp.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (this.currentFilters.sortBy === 'rating') {
      temp.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    this.itinerarySteps[index].places = temp;
    this.itinerarySteps[index].isLoading = false;
    this.cdr.detectChanges();
  }

  onFiltersChanged(filters: FilterState) {
    this.currentFilters = filters;
    if (this.currentPlan) {
      this.filterItinerary();
    }
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

        // Auto-refresh results if mood is selected
        if (this.selectedMood) {
          this.onMoodSelected(this.selectedMood);
        }
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

        // Auto-refresh results if mood is selected
        if (this.selectedMood) {
          this.onMoodSelected(this.selectedMood);
        }
      })
      .catch(err => {
        console.error('Geocoding error', err);
        this.locationError = 'Could not find that location. Please try a different address.';
        this.isLoading = false;
      });
  }
}
