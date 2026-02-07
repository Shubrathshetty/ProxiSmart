import { Injectable } from '@angular/core';
import { Mood } from './mood.service';

export interface PlanStep {
    stepNumber: number;
    label: string; // e.g. "Dinner"
    description: string; // e.g. "Start with a nice meal"
    searchType: string; // Google Place type e.g. 'restaurant'
    searchKeyword?: string; // e.g. 'romantic'
}

export interface ItineraryPlan {
    title: string;
    moodId: string;
    steps: PlanStep[];
}

export interface PlannerContext {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    company: 'solo' | 'date' | 'friends' | 'family';
}

@Injectable({
    providedIn: 'root'
})
export class PlannerService {

    constructor() { }

    generatePlan(mood: Mood, context: PlannerContext): ItineraryPlan {
        let steps: PlanStep[] = [];
        let title = `Your ${mood.label} Plan`;

        // Basic heuristic engine
        // Real AI would come from a backend, but we simulate logic here

        if (mood.id === 'date') {
            title = "Perfect Date Night";
            if (context.timeOfDay === 'evening' || context.timeOfDay === 'night') {
                steps = [
                    { stepNumber: 1, label: 'Dinner', description: 'Start with a romantic dinner', searchType: 'restaurant', searchKeyword: 'romantic' },
                    { stepNumber: 2, label: 'Drinks or Dessert', description: 'Head out for a drink or sweet treat', searchType: 'bar', searchKeyword: 'cocktail OR dessert' },
                    { stepNumber: 3, label: 'Stroll', description: 'End with a walk nearby', searchType: 'park', searchKeyword: 'park' }
                ];
            } else {
                steps = [
                    { stepNumber: 1, label: 'Activity', description: 'Do something fun together', searchType: 'bowling_alley', searchKeyword: 'fun' },
                    { stepNumber: 2, label: 'Meal', description: 'Grab a bite', searchType: 'restaurant', searchKeyword: 'lunch' }
                ];
            }
        } else if (mood.id === 'work') {
            title = "Productive Session";
            steps = [
                { stepNumber: 1, label: 'Work Spot', description: 'Find a focused environment', searchType: 'cafe', searchKeyword: 'wifi quiet' },
                { stepNumber: 2, label: 'Break', description: 'Stretch your legs', searchType: 'park', searchKeyword: 'park' }
            ];
        } else if (mood.id === 'chill') {
            title = "Relaxation Mode";
            steps = [
                { stepNumber: 1, label: 'Unwind', description: 'Get a coffee or tea', searchType: 'cafe', searchKeyword: 'cozy' },
                { stepNumber: 2, label: 'Nature', description: 'Sit in a park', searchType: 'park', searchKeyword: 'scenic' }
            ];
        } else if (mood.id === 'party') {
            title = "Night Out";
            steps = [
                { stepNumber: 1, label: 'Pre-game / Dinner', description: 'Fuel up before the night', searchType: 'bar', searchKeyword: 'lively' },
                { stepNumber: 2, label: 'Partying', description: 'Hit the dance floor', searchType: 'night_club', searchKeyword: 'dance' }
            ];
        } else if (mood.id === 'adventure') {
            title = "Adventure Time";
            steps = [
                { stepNumber: 1, label: 'Explore', description: 'Check out a landmark', searchType: 'tourist_attraction', searchKeyword: 'sightseeing' },
                { stepNumber: 2, label: 'Refuel', description: 'Grab a hearty meal', searchType: 'restaurant', searchKeyword: 'local food' }
            ];
        } else {
            // Default / Quick Bite
            steps = [
                { stepNumber: 1, label: mood.label, description: 'Find a great spot', searchType: mood.types[0], searchKeyword: mood.keywords?.join(' ') }
            ];
        }

        return {
            title,
            moodId: mood.id,
            steps
        };
    }
}
