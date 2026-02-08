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
    constructor(private ngZone: NgZone) { }

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

    reverseGeocode(lat: number, lng: number): Promise<string> {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject('Google Maps API not loaded');
                return;
            }
            const geocoder = new google.maps.Geocoder();
            const latlng = { lat: lat, lng: lng };
            geocoder.geocode({ location: latlng }, (results, status) => {
                this.ngZone.run(() => {
                    if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                        resolve(results[0].formatted_address);
                    } else {
                        reject(status);
                    }
                });
            });
        });
    }

    async searchByType(location: { lat: number, lng: number }, type: string, keyword?: string, openNow: boolean = false): Promise<PlaceResult[]> {
        if (typeof google === 'undefined') {
            throw new Error('Google Maps API not loaded');
        }

        const request: any = {
            locationRestriction: {
                center: { lat: location.lat, lng: location.lng },
                radius: 15000
            },
            includedTypes: [type],
            maxResultCount: 20,
            rankPreference: 'DISTANCE',
            languageCode: 'en'
        };

        if (keyword) {
            request.textQuery = keyword;
        }

        if (openNow) {
            request.isOpenNow = true;
        }

        console.log(`PlacesService (New API): Searching type=${type}, keyword=${keyword}, openNow=${openNow}`);

        try {
            // Use new Place.searchNearby API
            const { places } = await google.maps.places.Place.searchNearby(request);

            console.log(`PlacesService (New API): Found ${places?.length || 0} places`);

            if (!places || places.length === 0) {
                return [];
            }

            return await this.ngZone.run(async () => {
                const mappedResults: PlaceResult[] = [];

                for (const place of places) {
                    const placeLoc = {
                        lat: place.location!.lat(),
                        lng: place.location!.lng()
                    };

                    // Robust open status extraction
                    let openStatus: boolean | undefined;
                    if (openNow) {
                        openStatus = true; // Trust API filter
                    } else if (place.isOpen) {
                        try {
                            const isOpenResult = place.isOpen();
                            // Handle if it's a Promise or direct boolean
                            openStatus = isOpenResult instanceof Promise ? await isOpenResult : isOpenResult;
                        } catch (e) {
                            openStatus = undefined;
                        }
                    }

                    mappedResults.push({
                        placeId: place.id!,
                        name: place.displayName || place.formattedAddress || 'Unknown',
                        location: placeLoc,
                        rating: place.rating ?? undefined,
                        isOpen: openStatus,
                        priceLevel: (place as any).priceLevel ?? undefined,
                        vicinity: place.formattedAddress ?? undefined,
                        distance: this.calculateDistance(location.lat, location.lng, placeLoc.lat, placeLoc.lng)
                    });
                }

                return mappedResults;
            });
        } catch (error) {
            console.error('Place.searchNearby error:', error);
            throw error;
        }
    }

    searchNearby(location: { lat: number, lng: number }, mood: Mood): Promise<PlaceResult[]> {
        // Reuse searchByType for backward compatibility or simple mood search
        // We use the first type and all keywords joined by OR
        const keyword = mood.keywords ? mood.keywords.join(' OR ') : undefined;
        return this.searchByType(location, mood.types[0], keyword);
    }

    public calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
