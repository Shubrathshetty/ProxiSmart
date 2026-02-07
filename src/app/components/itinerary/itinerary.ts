import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaceResult } from '../../services/places.service';
import { PlaceCard } from '../place-card/place-card';
import { PlaceList } from '../place-list/place-list'; // Reuse list logic if possible, or just card
// But PlaceList handles loading/error.
// We probably want a "Step" block.

export interface StepResult {
    step: any; // PlanStep
    places: PlaceResult[];
    isLoading: boolean;
    error?: string;
}

@Component({
    selector: 'app-itinerary',
    standalone: true,
    imports: [CommonModule, PlaceCard],
    templateUrl: './itinerary.html',
    styleUrl: './itinerary.css'
})
export class Itinerary {
    @Input() title: string = '';
    @Input() steps: StepResult[] = [];

    constructor() { }

    sharePlan() {
        const text = `Check out my plan for ${this.title}:\n` +
            this.steps.map((s, i) => `Step ${i + 1}: ${s.step.label} - ${s.step.description}`).join('\n');

        // Copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            alert('Plan copied to clipboard! Share it with friends.');
        }).catch(err => {
            console.error('Failed to copy', err);
            // Fallback
            alert(text);
        });
    }
}
