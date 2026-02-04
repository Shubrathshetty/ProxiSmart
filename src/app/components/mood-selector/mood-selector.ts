import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mood, MoodService } from '../../services/mood.service';

@Component({
  selector: 'app-mood-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mood-selector.html',
  styleUrl: './mood-selector.css',
})
export class MoodSelector {
  moods: Mood[] = [];
  @Output() moodSelected = new EventEmitter<Mood>();
  selectedMoodId: string | null = null;

  constructor(private moodService: MoodService) {
    this.moods = this.moodService.getMoods();
  }

  selectMood(mood: Mood) {
    this.selectedMoodId = mood.id;
    this.moodSelected.emit(mood);
  }
}
