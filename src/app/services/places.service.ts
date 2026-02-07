/// <reference types="google.maps" />
import { Injectable, NgZone } from '@angular/core';
import { Mood } from './mood.service';

export interface PlaceResult {
    placeId: string;
    name: string;
    location: { lat: number, lng: number };
    rating?: number;
    isOpen?: boolean;
    priceLevel?: number;
    vicinity?: string;
    photos?: any[];
    distance?: number; // km
}

@Injectable({
    providedIn: 'root'
})
export class PlacesService {
    private service: google.maps.places.PlacesService | null = null;

    constructor(private ngZone: NgZone) { }

    private initService(): void {
        if (!this.service && typeof google !== 'undefined') {
            const mapDiv = document.createElement('div');
            this.service = new google.maps.places.PlacesService(mapDiv as HTMLDivElement);
        }
    }

    geocode(address: string): Promise<{ lat: number, lng: number }> {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject('Google Maps API not loaded');
                return;
            }
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: address }, (results, status) => {
                this.ngZone.run(() => {
                    if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                        const location = results[0].geometry.location;
                        resolve({
                            lat: location.lat(),
                            lng: location.lng()
                        });
                    } else {
                        reject(status);
                    }
                });
            });
        });
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
                radius: 5000, // 5km radius
                type: mood.types[0],
            };

            if (mood.keywords && mood.keywords.length > 0) {
                request.keyword = mood.keywords.join(' OR ');
            }

            this.service!.nearbySearch(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                this.ngZone.run(() => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        const mappedResults: PlaceResult[] = results.map((place: google.maps.places.PlaceResult) => {
                            const placeLoc = {
                                lat: place.geometry!.location!.lat(),
                                lng: place.geometry!.location!.lng()
                            };
                            return {
                                placeId: place.place_id!,
                                name: place.name!,
                                location: placeLoc,
                                rating: place.rating,
                                isOpen: place.opening_hours?.isOpen ? place.opening_hours.isOpen() : (place.opening_hours as any)?.open_now,
                                priceLevel: place.price_level,
                                vicinity: place.vicinity,
                                distance: this.calculateDistance(location.lat, location.lng, placeLoc.lat, placeLoc.lng)
                            };
                        });
                        resolve(mappedResults);
                    } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        resolve([]);
                    } else {
                        reject(status);
                    }
                });
            });
        });
    }

    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
