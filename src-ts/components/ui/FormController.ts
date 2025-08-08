import type { TimerConfig } from '../../types/timer.js';

export class FormController {
  private enableWarmupCheckbox: HTMLInputElement;
  private warmupDurationInput: HTMLInputElement;
  private warmupDurationWrapper: HTMLElement;
  private stepsInput: HTMLInputElement;
  private durationInput: HTMLInputElement;

  constructor() {
    this.enableWarmupCheckbox = document.getElementById("enableWarmup") as HTMLInputElement;
    this.warmupDurationInput = document.getElementById("warmupDuration") as HTMLInputElement;
    this.warmupDurationWrapper = document.querySelector(".warmup-duration-wrapper") as HTMLElement;
    this.stepsInput = document.getElementById("steps") as HTMLInputElement;
    this.durationInput = document.getElementById("duration") as HTMLInputElement;
  }

  public initialize(): void {
    this.initializeWarmupToggle();
  }

  private initializeWarmupToggle(): void {
    if (!this.enableWarmupCheckbox.checked) {
      this.warmupDurationWrapper.classList.add("hidden");
    }

    this.enableWarmupCheckbox.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        this.warmupDurationWrapper.classList.remove("hidden");
      } else {
        this.warmupDurationWrapper.classList.add("hidden");
      }
    });
  }

  public getTimerConfig(): TimerConfig {
    return {
      steps: parseInt(this.stepsInput.value),
      duration: parseInt(this.durationInput.value),
      warmUpEnabled: this.enableWarmupCheckbox.checked,
      warmUpDuration: parseInt(this.warmupDurationInput.value)
    };
  }

  public validateForm(): boolean {
    const config = this.getTimerConfig();
    
    if (config.steps < 1 || config.steps > 20) {
      alert("Steps must be between 1 and 20");
      return false;
    }
    
    if (config.duration < 5 || config.duration > 300) {
      alert("Duration must be between 5 and 300 seconds");
      return false;
    }
    
    if (config.warmUpEnabled && (config.warmUpDuration < 3 || config.warmUpDuration > 30)) {
      alert("Warm-up duration must be between 3 and 30 seconds");
      return false;
    }
    
    return true;
  }
}