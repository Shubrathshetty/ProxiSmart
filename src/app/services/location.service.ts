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

    getCurrentPosition(): Promise<Coordinates> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Geolocation not supported');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords: Coordinates = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.currentLocationSubject.next(coords);
                    resolve(coords);
                },
                (error) => {
                    reject(error);
                },
                { timeout: 10000, enableHighAccuracy: false, maximumAge: 300000 }
            );
        });
    }

    setManualLocation(lat: number, lng: number): void {
        const coords = { lat, lng };
        this.currentLocationSubject.next(coords);
    }
}
