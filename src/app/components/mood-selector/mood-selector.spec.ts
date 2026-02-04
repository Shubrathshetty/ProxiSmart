import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoodSelector } from './mood-selector';

describe('MoodSelector', () => {
  let component: MoodSelector;
  let fixture: ComponentFixture<MoodSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoodSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoodSelector);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
