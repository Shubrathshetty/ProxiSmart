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
  imports: [CommonModule, FormsModule, MoodSelector, Filters, Itinerary],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  userLocation: { lat: number, lng: number, accuracy?: number } | null = null;
  detectedAddress: string = '';
  locationError: string = '';

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
    this.updateTimeOfDay();
    this.initializeApp();
  }

  private updateTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) this.context.timeOfDay = 'morning';
    else if (hour < 17) this.context.timeOfDay = 'afternoon';
    else if (hour < 20) this.context.timeOfDay = 'evening';
    else this.context.timeOfDay = 'night';
    console.log('Auto-detected time:', this.context.timeOfDay);
  }

  private updateDetectedAddress() {
    if (!this.userLocation) return;
    this.placesService.reverseGeocode(this.userLocation.lat, this.userLocation.lng)
      .then(address => {
        this.detectedAddress = address;
        console.log('Detected address:', address);
        this.cdr.detectChanges();
      })
      .catch(err => console.error('Reverse geocode failed:', err));
  }

  debugGeo: string = '';

  private initializeApp() {
    // 1. Try to load saved location for instant UI
    if (this.loadLocation()) {
      console.log('Loaded saved location');
      // Continue to check GPS in background to see if we moved!
    }

    // 2. Try GPS (Browser or Google)
    this.locationService.getCurrentPosition()
      .then((coords: any) => {
        const accuracy = coords.accuracy || 0;
        this.debugGeo = `Lat: ${coords.latitude}, Lng: ${coords.longitude}, Acc: ${accuracy}m`;
        console.log('Location success:', this.debugGeo);

        // Strict Check: If accuracy > 5000m (5km), reject it (likely ISP)
        // BUT if we have NO saved userLocation, we have to reject it.
        // If we DO have userLocation, we just keep using it (don't overwrite with bad data).
        if (accuracy > 5000) {
          console.warn('Rejecting low accuracy location:', accuracy);
          if (!this.userLocation) {
            this.locationError = 'Low accuracy detected. Please enter your city manually.';
            this.cdr.detectChanges();
          }
          // Fallback to Google Geo if needed and no saved location?
          // Or if saved location is old?
          // For now, if GPS is bad, we do nothing (keep saved).
          // If no saved, we try Google fallback.
          if (!this.userLocation) {
            this.fallbackToGoogleGeo();
          }
          return;
        }

        // Check if we moved significantly (e.g. > 1km)
        if (this.userLocation) {
          const dist = this.placesService['calculateDistance'](
            this.userLocation.lat, this.userLocation.lng,
            coords.latitude, coords.longitude
          );
          if (dist < 1) {
            console.log('Location hasn\'t changed significantly (<1km). Keeping saved.');
            return;
          }
          console.log(`User moved ${dist.toFixed(1)}km. Updating location.`);
        }

        this.userLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: accuracy
        };
        this.saveLocation(this.userLocation);
        this.updateDetectedAddress();
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error('Location error', err);
        // If no saved location, try Google fallback
        if (!this.userLocation) {
          console.warn('Browser Geo failed. Falling back to Google Geo API...');
          this.fallbackToGoogleGeo();
        }
      });
  }

  private async fallbackToGoogleGeo() {
    try {
      console.log('Trying Google Geo API (skipping - moving to IP)...');
      // Skip Google Geo and go directly to IP-based location
      this.fallbackToIPLocation();
    } catch (err) {
      console.error('Fallback failed, trying IP-based location...', err);
      this.fallbackToIPLocation();
    }
  }

  private async fallbackToIPLocation() {
    try {
      console.log('Trying IP-based geolocation...');
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (data.latitude && data.longitude) {
        this.userLocation = {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 5000 // City-level accuracy
        };
        this.detectedAddress = `${data.city}, ${data.region}, ${data.country_name}`;
        this.saveLocation(this.userLocation);
        this.locationError = '';
        console.log('✅ IP-based location detected:', this.detectedAddress);
        this.cdr.detectChanges();
      } else {
        throw new Error('IP location data incomplete');
      }
    } catch (err) {
      console.error('IP-based geolocation failed:', err);
      this.locationError = 'Unable to detect your location automatically. Please enter your city manually.';
      this.cdr.detectChanges();
    }
  }

  private getApiKey(): string | null {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('maps.googleapis.com/maps/api/js')) {
        try {
          const url = new URL(src);
          return url.searchParams.get('key');
        } catch (e) {
          console.error('Error parsing script URL', e);
        }
      }
    }
    return null;
  }

  onMoodSelected(mood: Mood) {
    if (!this.userLocation) {
      alert('Please set your location first!');
      return;
    }

    console.log('=== SEARCH DEBUG ===');
    console.log('Mood:', mood.label);
    console.log('Searching near coordinates:', this.userLocation);
    console.log('Detected address:', this.detectedAddress || 'Unknown');
    console.log('===================');

    // Show visual confirmation of search location
    const searchMsg = this.detectedAddress
      ? `Searching near: ${this.detectedAddress}`
      : `Searching near: ${this.userLocation.lat.toFixed(2)}, ${this.userLocation.lng.toFixed(2)}`;

    console.log('🔍', searchMsg);

    this.selectedMood = mood;
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
    this.refreshItinerary();
  }

  refreshItinerary() {
    if (!this.currentPlan || !this.userLocation) return;

    this.currentPlan.steps.forEach((step, index) => {
      this.itinerarySteps[index].isLoading = true;
      this.itinerarySteps[index].error = undefined;
      this.cdr.detectChanges();

      this.placesService.searchByType(
        this.userLocation!,
        step.searchType,
        step.searchKeyword,
        this.currentFilters.openNow // Server-side filter
      )
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

    // Note: Open Now is handled server-side now, but we keep this check
    // in case we have mixed results or need strict local filtering
    if (this.currentFilters.openNow) {
      // If we requested OpenNow=true, results are already open.
      // But if we cached 'All' and just switched on OpenNow client-side (not implemented),
      // we would filter here.
      // For now, trust the server or the logic in refreshItinerary.
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
    const openNowChanged = filters.openNow !== this.currentFilters.openNow;
    this.currentFilters = filters;

    if (this.currentPlan) {
      if (openNowChanged) {
        // If Open Now toggled, we MUST re-fetch from server to get accurate status
        this.refreshItinerary();
      } else {
        // Otherwise just local filter
        this.filterItinerary();
      }
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
    this.detectedAddress = '';
    this.locationError = 'Please enter your specific location manually.';
  }

  retryLocation() {
    this.isLoading = true;
    this.locationError = '';

    this.locationService.getCurrentPosition()
      .then((coords: any) => {
        this.userLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy
        };
        this.saveLocation(this.userLocation);
        this.updateDetectedAddress();
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

  forceRefreshLocation() {
    console.log('🔄 Forcing location refresh...');
    // Clear saved location
    localStorage.removeItem('user_location');
    this.userLocation = null;
    this.detectedAddress = '';
    this.locationError = '';

    // Trigger IP-based detection immediately
    this.isLoading = true;
    this.fallbackToIPLocation();
  }

  setLocationByAddress(address: string) {
    if (!address) return;

    this.isLoading = true;
    this.locationError = '';

    this.placesService.geocode(address)
      .then(coords => {
        this.userLocation = {
          lat: coords.lat,
          lng: coords.lng,
          accuracy: 0 // Manual/Geocoded is considered precise
        };
        this.saveLocation(this.userLocation);
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

  saveLocation(loc: { lat: number, lng: number, accuracy?: number }) {
    localStorage.setItem('user_location', JSON.stringify(loc));
  }

  loadLocation(): boolean {
    const saved = localStorage.getItem('user_location');
    if (saved) {
      try {
        this.userLocation = JSON.parse(saved);
        this.updateDetectedAddress();
        return true;
      } catch (e) {
        console.error('Failed to parse saved location', e);
        return false;
      }
    }
    return false;
  }
}
