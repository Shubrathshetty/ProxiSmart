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
            label: 'Work',
            icon: 'briefcase',
            types: ['cafe', 'library'],
            keywords: ['coworking']
        },
        {
            id: 'date',
            label: 'Date',
            icon: 'heart',
            types: ['restaurant', 'bar', 'night_club'],
            keywords: ['romantic', 'lounge']
        },
        {
            id: 'quick_bite',
            label: 'Quick Bite',
            icon: 'fast-food',
            types: ['meal_takeaway', 'bakery', 'cafe'],
            keywords: ['fast food', 'snack']
        },
        {
            id: 'budget',
            label: 'Budget',
            icon: 'wallet',
            types: ['restaurant', 'meal_takeaway'],
            keywords: ['cheap', 'inexpensive']
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
