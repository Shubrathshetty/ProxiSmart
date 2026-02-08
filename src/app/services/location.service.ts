import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Coordinates {
    lat: number;
    lng: number;
}

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private currentLocationSubject = new BehaviorSubject<Coordinates | null>(null);
    currentLocation$ = this.currentLocationSubject.asObservable();

    constructor() { }

    getCurrentPosition(): Promise<GeolocationCoordinates> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Geolocation not supported');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // The original code was converting GeolocationCoordinates to Coordinates
                    // and then updating currentLocationSubject.
                    // With the change to return GeolocationCoordinates, we resolve directly.
                    // The currentLocationSubject still expects Coordinates, so we need to
                    // convert it if we want to keep updating it.
                    // For now, based on the instruction, we only change the return type
                    // and the resolve call. The update to currentLocationSubject is removed
                    // as it was tied to the old 'coords' variable.
                    resolve(position.coords);
                },
                (error) => {
                    reject(error);
                },
                { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
            );
        });
    }

    setManualLocation(lat: number, lng: number): void {
        const coords = { lat, lng };
        this.currentLocationSubject.next(coords);
    }

    getGoogleGeolocation(apiKey: string): Promise<GeolocationCoordinates> {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        considerIp: true // Use WiFi/Cell + IP for best result
                    })
                });

                if (!response.ok) {
                    throw new Error(`Google Geo API Error: ${response.statusText}`);
                }

                const data = await response.json();
                if (data.location) {
                    // Start construction of GeolocationCoordinates-like object
                    // Note: We only get lat/lng/accuracy from this API.
                    // We mock the other properties to satisfy the interface if needed,
                    // or just return the relevant parts.
                    const coords: any = {
                        latitude: data.location.lat,
                        longitude: data.location.lng,
                        accuracy: data.accuracy,
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null
                    };
                    resolve(coords);
                } else {
                    reject('No location found in Google API response');
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}
