import type { TimerState, TimerConfig, TimerEventType } from '../../types/timer.js';
import { AudioManager } from './AudioManager.js';
import { TimerDisplayController } from './TimerDisplay.js';

export class Timer {
  private state: TimerState;
  private timerInterval: number | null = null;
  private countdownBeeps: Set<number> = new Set();
  private audioManager: AudioManager;
  private display: TimerDisplayController;
  private activeExcerciseNames: string[] | null = null;

  constructor() {
    this.state = {
      currentStep: 0,
      timeRemaining: 0,
      totalSteps: 0,
      stepDuration: 0,
      isRunning: false,
      isWarmUp: false,
      warmUpEnabled: false,
      warmUpDuration: 5,
      hasPlayedWarning: false
    };
    
    this.audioManager = new AudioManager();
    this.display = new TimerDisplayController();
  }

  public setActiveExcerciseNames(excercises: string[] | null): void {
    this.activeExcerciseNames = excercises;
  }

  public start(config: TimerConfig): void {
    const presetSteps = this.activeExcerciseNames ? this.activeExcerciseNames.length : null;
    
    this.state = {
      ...this.state,
      totalSteps: presetSteps ?? config.steps,
      stepDuration: config.duration,
      warmUpEnabled: config.warmUpEnabled,
      warmUpDuration: config.warmUpDuration,
      currentStep: 0,
      isRunning: true,
      hasPlayedWarning: false
    };

    this.countdownBeeps.clear();

    if (this.state.warmUpEnabled) {
      this.state.isWarmUp = true;
      this.state.timeRemaining = this.state.warmUpDuration;
    } else {
      this.state.isWarmUp = false;
      this.state.currentStep = 1;
      this.state.timeRemaining = this.state.stepDuration;
    }

    this.showTimerSection();
    this.display.updateDisplay(this.state, this.activeExcerciseNames);

    document.addEventListener("click", () => {}, { once: true });

    this.timerInterval = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick(): void {
    this.state.timeRemaining--;
    this.display.updateDisplay(this.state, this.activeExcerciseNames);

    if (this.state.timeRemaining <= 3 && this.state.timeRemaining > 0) {
      if (!this.countdownBeeps.has(this.state.timeRemaining)) {
        this.audioManager.playWarning();
        this.countdownBeeps.add(this.state.timeRemaining);
      }
    }

    if (this.state.timeRemaining <= 0) {
      if (this.state.isWarmUp) {
        this.completeWarmUp();
      } else {
        this.completeStep();
      }
    }
  }

  private completeWarmUp(): void {
    this.audioManager.playStepComplete();
    this.state.isWarmUp = false;
    this.state.currentStep = 1;
    this.state.timeRemaining = this.state.stepDuration;
    this.countdownBeeps.clear();

    setTimeout(() => {
      document.getElementById("timerDisplay")?.classList.remove("warm-up");
    }, 500);
  }

  private completeStep(): void {
    this.audioManager.playStepComplete();

    if (this.state.currentStep < this.state.totalSteps) {
      this.state.currentStep++;
      this.state.timeRemaining = this.state.stepDuration;
      this.state.hasPlayedWarning = false;
      this.countdownBeeps.clear();

      this.display.showStepComplete();
    } else {
      this.complete();
    }
  }

  private complete(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.state.isRunning = false;
    this.audioManager.playWorkoutComplete();
    this.display.showWorkoutComplete();

    setTimeout(() => {
      this.reset();
    }, 3000);
  }

  public stop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.reset();
  }

  public reset(): void {
    this.state = {
      ...this.state,
      isRunning: false,
      isWarmUp: false,
      currentStep: 0,
      timeRemaining: 0,
      hasPlayedWarning: false
    };
    
    this.countdownBeeps.clear();
    this.showSetupSection();
    this.display.reset();
    this.display.renderUpcomingExcercisesPreview(this.activeExcerciseNames);
  }

  private showTimerSection(): void {
    document.getElementById("setupSection")?.classList.add("hidden");
    document.getElementById("stopBtn")?.classList.remove("hidden");
  }

  private showSetupSection(): void {
    document.getElementById("setupSection")?.classList.remove("hidden");
    document.getElementById("stopBtn")?.classList.add("hidden");
  }

  public getState(): Readonly<TimerState> {
    return { ...this.state };
  }
}