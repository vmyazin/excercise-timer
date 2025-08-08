// src-ts/components/timer/Timer.ts
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
      currentSet: 0,
      timeRemaining: 0,
      totalSets: 0,
      setDuration: 0,
      isRunning: false,
      isWarmUp: false,
      isRest: false,
      warmUpEnabled: false,
      warmUpDuration: 10,
      restEnabled: false,
      restDuration: 5,
      hasPlayedWarning: false
    };
    
    this.audioManager = new AudioManager();
    this.display = new TimerDisplayController();
  }

  public setActiveExcerciseNames(excercises: string[] | null): void {
    this.activeExcerciseNames = excercises;
  }

  public start(config: TimerConfig): void {
    const presetSets = this.activeExcerciseNames ? this.activeExcerciseNames.length : null;
    
    this.state = {
      ...this.state,
      totalSets: presetSets ?? config.sets,
      setDuration: config.duration,
      warmUpEnabled: config.warmUpEnabled,
      warmUpDuration: config.warmUpDuration,
      restEnabled: config.restEnabled,
      restDuration: config.restDuration,
      currentSet: 0,
      isRunning: true,
      isRest: false,
      hasPlayedWarning: false
    };

    this.countdownBeeps.clear();

    if (this.state.warmUpEnabled) {
      this.state.isWarmUp = true;
      this.state.timeRemaining = this.state.warmUpDuration;
    } else {
      this.state.isWarmUp = false;
      this.state.currentSet = 1;
      this.state.timeRemaining = this.state.setDuration;
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
      } else if (this.state.isRest) {
        this.completeRest();
      } else {
        this.completeSet();
      }
    }
  }

  private completeWarmUp(): void {
    this.audioManager.playSetComplete();
    this.state.isWarmUp = false;
    this.state.currentSet = 1;
    this.state.timeRemaining = this.state.setDuration;
    this.countdownBeeps.clear();

    setTimeout(() => {
      document.getElementById("timerDisplay")?.classList.remove("warm-up");
    }, 500);
  }

  private completeSet(): void {
    this.audioManager.playSetComplete();

    if (this.state.currentSet < this.state.totalSets) {
      // Check if we should start a rest period
      if (this.state.restEnabled && this.state.currentSet < this.state.totalSets) {
        this.state.isRest = true;
        this.state.timeRemaining = this.state.restDuration;
        this.state.hasPlayedWarning = false;
        this.countdownBeeps.clear();
        this.display.showSetComplete();
      } else {
        // No rest, go directly to next set
        this.state.currentSet++;
        this.state.timeRemaining = this.state.setDuration;
        this.state.hasPlayedWarning = false;
        this.countdownBeeps.clear();
        this.display.showSetComplete();
      }
    } else {
      this.complete();
    }
  }

  private completeRest(): void {
    this.audioManager.playSetComplete();
    this.state.isRest = false;
    this.state.currentSet++;
    this.state.timeRemaining = this.state.setDuration;
    this.state.hasPlayedWarning = false;
    this.countdownBeeps.clear();
  }

  private complete(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.state.isRunning = false;
    this.audioManager.playWorkoutComplete();
    this.display.showWorkoutComplete();

    // Replace Stop button with New Workout (blue) and wait for user action
    this.setStopButtonMode(true);
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
      isRest: false,
      currentSet: 0,
      timeRemaining: 0,
      hasPlayedWarning: false
    };
    
    this.countdownBeeps.clear();
    this.showSetupSection();
    this.display.reset();
    this.display.renderUpcomingExcercisesPreview(this.activeExcerciseNames);

    // Restore Stop button appearance for next run
    this.setStopButtonMode(false);
  }

  private showTimerSection(): void {
    // Ensure Stop button is in default (red) mode when starting
    this.setStopButtonMode(false);
    document.getElementById("setupSection")?.classList.add("hidden");
    document.getElementById("stopBtn")?.classList.remove("hidden");
  }

  private showSetupSection(): void {
    document.getElementById("setupSection")?.classList.remove("hidden");
    document.getElementById("stopBtn")?.classList.add("hidden");
  }

  private setStopButtonMode(isNewWorkout: boolean): void {
    const stopBtn = document.getElementById("stopBtn");
    if (!stopBtn) return;
    const textSpan = stopBtn.querySelector('.button-text') as HTMLElement | null;

    if (isNewWorkout) {
      stopBtn.classList.remove('stop-btn');
      stopBtn.classList.add('start-btn');
      if (textSpan) textSpan.textContent = 'New Workout';
    } else {
      stopBtn.classList.remove('start-btn');
      stopBtn.classList.add('stop-btn');
      if (textSpan) textSpan.textContent = 'Stop Timer';
    }
  }

  public getState(): Readonly<TimerState> {
    return { ...this.state };
  }
}