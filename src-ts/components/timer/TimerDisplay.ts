import type { TimerState, TimerDisplay } from '../../types/timer.js';

export class TimerDisplayController {
  private timeDisplayEl: HTMLElement;
  private currentStepEl: HTMLElement;
  private progressInfoEl: HTMLElement;
  private progressFillEl: HTMLElement;
  private timerDisplayEl: HTMLElement;

  constructor() {
    this.timeDisplayEl = document.getElementById("timeDisplay")!;
    this.currentStepEl = document.getElementById("currentStep")!;
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
    this.currentStepEl.textContent = display.currentStep;
    this.progressInfoEl.textContent = display.progressInfo;
    this.progressFillEl.style.width = `${display.progressPercent}%`;

    this.updateTimerDisplayClasses(state);
  }

  private getDisplayData(state: TimerState, activeExcerciseNames: string[] | null): TimerDisplay {
    const timeDisplay = this.formatTime(state.timeRemaining);
    
    let currentStep: string;
    let progressInfo: string;
    
    if (state.isWarmUp) {
      currentStep = "Warm Up";
      progressInfo = "Get ready to start!";
      this.timerDisplayEl.classList.add("warm-up");
      this.timerDisplayEl.classList.remove("rest");
    } else if (state.isRest) {
      currentStep = "Rest";
      const nextStepNum = state.currentStep + 1;
      const nextExcerciseName = this.getNextExcerciseName(state, activeExcerciseNames);
      const nextStepDisplay = nextExcerciseName ? nextExcerciseName : `Step ${nextStepNum}`;
      progressInfo = `Next: ${nextStepDisplay}`;
      this.timerDisplayEl.classList.add("rest");
      this.timerDisplayEl.classList.remove("warm-up");
    } else {
      const excerciseName = this.getCurrentExcerciseName(state, activeExcerciseNames);
      currentStep = excerciseName ? excerciseName : `Step ${state.currentStep} of ${state.totalSteps}`;
      
      const remainingSteps = Math.max(state.totalSteps - state.currentStep, 0);
      const suffix = activeExcerciseNames && !excerciseName ? " (custom)" : "";
      progressInfo = `${remainingSteps} steps remaining${suffix}`;
      
      this.timerDisplayEl.classList.remove("warm-up", "rest");
    }

    let progressPercent: number;
    if (state.isWarmUp) {
      progressPercent = ((state.warmUpDuration - state.timeRemaining) / state.warmUpDuration) * 100;
    } else if (state.isRest) {
      progressPercent = ((state.restDuration - state.timeRemaining) / state.restDuration) * 100;
    } else {
      progressPercent = ((state.stepDuration - state.timeRemaining) / state.stepDuration) * 100;
    }

    return { currentStep, timeDisplay, progressInfo, progressPercent };
  }

  private getCurrentExcerciseName(state: TimerState, activeExcerciseNames: string[] | null): string | null {
    if (!activeExcerciseNames || state.isWarmUp || state.isRest || state.currentStep <= 0) return null;
    
    const index = state.currentStep - 1;
    if (index >= 0 && index < activeExcerciseNames.length) {
      return activeExcerciseNames[index];
    }
    return null;
  }

  private getNextExcerciseName(state: TimerState, activeExcerciseNames: string[] | null): string | null {
    if (!activeExcerciseNames || state.currentStep < 0) return null;
    
    const nextIndex = state.currentStep; // currentStep is the step we just completed, so next is currentStep (0-indexed)
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

  public showStepComplete(): void {
    this.timerDisplayEl.classList.add("step-complete");
    setTimeout(() => {
      this.timerDisplayEl.classList.remove("step-complete");
    }, 1000);
  }

  public showWorkoutComplete(): void {
    this.currentStepEl.textContent = "Workout Complete!";
    this.timeDisplayEl.textContent = "DONE";
    this.progressInfoEl.textContent = "Great job! 🎉";
    this.progressFillEl.style.width = "100%";
    this.timerDisplayEl.classList.add("all-complete");
  }

  public reset(): void {
    this.timerDisplayEl.classList.remove("warning", "step-complete", "all-complete", "warm-up");
    this.currentStepEl.textContent = "Ready to Start";
    this.timeDisplayEl.textContent = "00:00";
    this.progressInfoEl.textContent = "";
    this.progressFillEl.style.width = "0%";
  }

  public renderUpcomingExcercisesPreview(activeExcerciseNames: string[] | null): void {
    const setupSection = document.getElementById("setupSection");
    if (!setupSection || setupSection.classList.contains("hidden")) return;

    if (activeExcerciseNames && activeExcerciseNames.length) {
      this.progressInfoEl.textContent = `Preset loaded: ${activeExcerciseNames.length} steps`;
    } else {
      this.progressInfoEl.textContent = "";
    }
  }
}