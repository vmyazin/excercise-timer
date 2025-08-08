import type { TimerState, TimerDisplay } from '../../types/timer.js';

export class TimerDisplayController {
  private timeDisplayEl: HTMLElement;
  private currentSetEl: HTMLElement;
  private progressInfoEl: HTMLElement;
  private progressFillEl: HTMLElement;
  private timerDisplayEl: HTMLElement;

  constructor() {
    this.timeDisplayEl = document.getElementById("timeDisplay")!;
    this.currentSetEl = document.getElementById("currentSet")!;
    this.progressInfoEl = document.getElementById("progressInfo")!;
    this.progressFillEl = document.getElementById("progressFill")!;
    this.timerDisplayEl = document.getElementById("timerDisplay")!;
  }

  public formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  public updateDisplay(state: TimerState, activeExcerciseNames: string[] | null): void {
    const display = this.getDisplayData(state, activeExcerciseNames);
    
    this.timeDisplayEl.textContent = display.timeDisplay;
    this.currentSetEl.textContent = display.currentSet;
    this.progressInfoEl.textContent = display.progressInfo;
    this.progressFillEl.style.width = `${display.progressPercent}%`;

    this.updateTimerDisplayClasses(state);
  }

  private getDisplayData(state: TimerState, activeExcerciseNames: string[] | null): TimerDisplay {
    const timeDisplay = this.formatTime(state.timeRemaining);
    
    let currentSet: string;
    let progressInfo: string;
    
    if (state.isWarmUp) {
      currentSet = "Warm Up";
      progressInfo = "Get ready to start!";
      this.timerDisplayEl.classList.add("warm-up");
      this.timerDisplayEl.classList.remove("rest");
    } else if (state.isRest) {
      currentSet = "Rest";
      const nextSetNum = state.currentSet + 1;
      const nextExcerciseName = this.getNextExcerciseName(state, activeExcerciseNames);
      const nextSetDisplay = nextExcerciseName ? nextExcerciseName : `Set ${nextSetNum}`;
      progressInfo = `Next: ${nextSetDisplay}`;
      this.timerDisplayEl.classList.add("rest");
      this.timerDisplayEl.classList.remove("warm-up");
    } else {
      const excerciseName = this.getCurrentExcerciseName(state, activeExcerciseNames);
      currentSet = excerciseName ? excerciseName : `Set ${state.currentSet} of ${state.totalSets}`;
      
      const remainingSets = Math.max(state.totalSets - state.currentSet, 0);
      const suffix = activeExcerciseNames && !excerciseName ? " (custom)" : "";
      progressInfo = `${remainingSets} sets remaining${suffix}`;
      
      this.timerDisplayEl.classList.remove("warm-up", "rest");
    }

    let progressPercent: number;
    if (state.isWarmUp) {
      progressPercent = ((state.warmUpDuration - state.timeRemaining) / state.warmUpDuration) * 100;
    } else if (state.isRest) {
      progressPercent = ((state.restDuration - state.timeRemaining) / state.restDuration) * 100;
    } else {
      progressPercent = ((state.setDuration - state.timeRemaining) / state.setDuration) * 100;
    }

    return { currentSet, timeDisplay, progressInfo, progressPercent };
  }

  private getCurrentExcerciseName(state: TimerState, activeExcerciseNames: string[] | null): string | null {
    if (!activeExcerciseNames || state.isWarmUp || state.isRest || state.currentSet <= 0) return null;
    
    const index = state.currentSet - 1;
    if (index >= 0 && index < activeExcerciseNames.length) {
      return activeExcerciseNames[index];
    }
    return null;
  }

  private getNextExcerciseName(state: TimerState, activeExcerciseNames: string[] | null): string | null {
    if (!activeExcerciseNames || state.currentSet < 0) return null;
    
    const nextIndex = state.currentSet; // currentSet is the set we just completed, so next is currentSet (0-indexed)
    if (nextIndex >= 0 && nextIndex < activeExcerciseNames.length) {
      return activeExcerciseNames[nextIndex];
    }
    return null;
  }

  private updateTimerDisplayClasses(state: TimerState): void {
    if (state.timeRemaining <= 3 && state.timeRemaining > 0) {
      this.timerDisplayEl.classList.add("warning");
    } else {
      this.timerDisplayEl.classList.remove("warning");
    }
  }

  public showSetComplete(): void {
    this.timerDisplayEl.classList.add("set-complete");
    setTimeout(() => {
      this.timerDisplayEl.classList.remove("set-complete");
    }, 1000);
  }

  public showWorkoutComplete(): void {
    this.currentSetEl.textContent = "Workout Complete!";
    this.timeDisplayEl.textContent = "DONE";
    this.progressInfoEl.textContent = "Great job! 🎉";
    this.progressFillEl.style.width = "100%";
    this.timerDisplayEl.classList.add("all-complete");
  }

  public reset(): void {
    this.timerDisplayEl.classList.remove("warning", "set-complete", "all-complete", "warm-up");
    this.currentSetEl.textContent = "Ready to Start";
    this.timeDisplayEl.textContent = "00:00";
    this.progressInfoEl.textContent = "";
    this.progressFillEl.style.width = "0%";
  }

  public renderUpcomingExcercisesPreview(activeExcerciseNames: string[] | null): void {
    const setupSection = document.getElementById("setupSection");
    if (!setupSection || setupSection.classList.contains("hidden")) return;

    if (activeExcerciseNames && activeExcerciseNames.length) {
      this.progressInfoEl.textContent = `Preset loaded: ${activeExcerciseNames.length} sets`;
    } else {
      this.progressInfoEl.textContent = "";
    }
  }
}