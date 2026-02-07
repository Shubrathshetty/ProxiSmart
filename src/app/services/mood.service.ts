import { Injectable } from '@angular/core';

export interface Mood {
    id: string;
    label: string;
    icon: string;
    types: string[]; // Google Places types
    keywords?: string[]; // Fallback or additional keywords
}

@Injectable({
    providedIn: 'root'
})
export class MoodService {
    private moods: Mood[] = [
        {
            id: 'work',
            label: 'Productive',
            icon: '💼',
            types: ['library', 'cafe', 'book_store'],
            keywords: ['quiet', 'wifi', 'study', 'coworking']
        },
        {
            id: 'date',
            label: 'Date Night',
            icon: '❤️',
            types: ['restaurant', 'bar', 'movie_theater', 'park'],
            keywords: ['romantic', 'candlelight', 'view', 'cozy']
        },
        {
            id: 'chill',
            label: 'Chill / Relax',
            icon: '☕',
            types: ['cafe', 'park', 'spa', 'art_gallery'],
            keywords: ['peaceful', 'scenic', 'garden', 'lounge']
        },
        {
            id: 'party',
            label: 'Party',
            icon: '🎉',
            types: ['night_club', 'bar', 'casino'],
            keywords: ['music', 'dance', 'cocktail', 'lively']
        },
        {
            id: 'adventure',
            label: 'Adventure',
            icon: '🏕️',
            types: ['campground', 'park', 'tourist_attraction', 'amusement_park'],
            keywords: ['hiking', 'viewpoint', 'trail', 'outdoor']
        },
        {
            id: 'quick_bite',
            label: 'Quick Bite',
            icon: '🍔',
            types: ['meal_takeaway', 'bakery', 'restaurant'],
            keywords: ['fast food', 'snack', 'street food']
        }
    ];

    constructor() { }

    getMoods(): Mood[] {
        return this.moods;
    }

    getMoodById(id: string): Mood | undefined {
        return this.moods.find(m => m.id === id);
    }
}
