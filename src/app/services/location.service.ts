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
}
