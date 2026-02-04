import { Injectable } from '@angular/core';
import { Observable } from 'rxjs'; // We might use Observables or Promises
import { Mood } from './mood.service';

// Interface for our app's place model
export interface PlaceResult {
    placeId: string;
    name: string;
    location: { lat: number, lng: number };
    rating?: number;
    isOpen?: boolean;
    priceLevel?: number;
    vicinity?: string;
    photos?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class PlacesService {
    private map: google.maps.Map | null = null;
    private service: google.maps.places.PlacesService | null = null;

    constructor() {
        // We need a map instance (even hidden) or a div to instantiate PlacesService properly in some versions,
        // but the JS SDK allows PlacesService to be instantiated with a div element (no map required).
    }

    private initService(): void {
        if (!this.service) {
            const mapDiv = document.createElement('div');
            this.service = new google.maps.places.PlacesService(mapDiv as HTMLDivElement);
        }
    }

    searchNearby(location: { lat: number, lng: number }, mood: Mood): Promise<PlaceResult[]> {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject('Google Maps API not loaded');
                return;
            }
            this.initService();

            const request: google.maps.places.PlaceSearchRequest = {
                location: new google.maps.LatLng(location.lat, location.lng),
                radius: 2000, // 2km
                type: mood.types[0], // Primary type
                // We can use 'keyword' to combine multiple terms if needed, but 'type' is strict
                // simpler for MVP to use the primary type or iterate?
                // Let's use keyword if type is generic.
                // Actually, 'rankBy' distance cannot be used with radius.
                // We use radius 2000 default.
            };

            // If we want multiple types, we might need multiple calls or use 'keyword' with OR? 
            // Places API doesn't support multiple types efficiently in one call in 'nearbySearch' 
            // (it treats them as OR or AND depending on version, historically strictly one type).
            // Let's stick to the first type for MVP simplicity or use 'keyword' for broader match.

            if (mood.keywords && mood.keywords.length > 0) {
                request.keyword = mood.keywords.join(' OR ');
            } else {
                // If no keywords, utilize the types array if possible ? 
                // For now, let's just use the first type to satisfy "Make one API call per mood selection" requirement.
                request.type = mood.types[0];
            }

            this.service!.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    const mappedResults: PlaceResult[] = results.map(place => ({
                        placeId: place.place_id!,
                        name: place.name!,
                        location: {
                            lat: place.geometry!.location!.lat(),
                            lng: place.geometry!.location!.lng()
                        },
                        rating: place.rating,
                        isOpen: place.opening_hours?.isOpen ? place.opening_hours.isOpen() : undefined,
                        priceLevel: place.price_level,
                        vicinity: place.vicinity
                    }));
                    resolve(mappedResults);
                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    resolve([]);
                } else {
                    reject(status);
                }
            });
        });
    }
}
