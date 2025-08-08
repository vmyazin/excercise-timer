// src-ts/components/ui/FormController.ts
import type { TimerConfig } from '../../types/timer.js';

export class FormController {
  private enableWarmupCheckbox: HTMLInputElement;
  private warmupDurationInput: HTMLInputElement;
  private warmupDurationWrapper: HTMLElement;
  private enableRestCheckbox: HTMLInputElement;
  private restDurationInput: HTMLInputElement;
  private restDurationWrapper: HTMLElement;
  private stepsInput: HTMLInputElement;
  private durationInput: HTMLInputElement;

  constructor() {
    this.enableWarmupCheckbox = document.getElementById("enableWarmup") as HTMLInputElement;
    this.warmupDurationInput = document.getElementById("warmupDuration") as HTMLInputElement;
    this.warmupDurationWrapper = document.querySelector(".warmup-duration-wrapper") as HTMLElement;
    this.enableRestCheckbox = document.getElementById("enableRest") as HTMLInputElement;
    this.restDurationInput = document.getElementById("restDuration") as HTMLInputElement;
    this.restDurationWrapper = document.querySelector(".rest-duration-wrapper") as HTMLElement;
    this.stepsInput = document.getElementById("steps") as HTMLInputElement;
    this.durationInput = document.getElementById("duration") as HTMLInputElement;
  }

  public initialize(): void {
    this.initializeWarmupToggle();
    this.initializeRestToggle();
    this.initializeCustomControls();
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

  private initializeRestToggle(): void {
    if (!this.enableRestCheckbox.checked) {
      this.restDurationWrapper.classList.add("hidden");
    }

    this.enableRestCheckbox.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        this.restDurationWrapper.classList.remove("hidden");
      } else {
        this.restDurationWrapper.classList.add("hidden");
      }
    });
  }

  public getTimerConfig(): TimerConfig {
    return {
      steps: parseInt(this.stepsInput.value),
      duration: parseInt(this.durationInput.value),
      warmUpEnabled: this.enableWarmupCheckbox.checked,
      warmUpDuration: parseInt(this.warmupDurationInput.value),
      restEnabled: this.enableRestCheckbox.checked,
      restDuration: parseInt(this.restDurationInput.value)
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
    
    if (config.restEnabled && (config.restDuration < 5 || config.restDuration > 60)) {
      alert("Rest duration must be between 5 and 60 seconds");
      return false;
    }
    
    return true;
  }

  private initializeCustomControls(): void {
    const controlButtons = document.querySelectorAll('.control-btn');
    
    controlButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const inputId = target.getAttribute('data-target');
        const isIncrement = target.classList.contains('increment');
        
        if (inputId) {
          const input = document.getElementById(inputId) as HTMLInputElement;
          if (input) {
            this.adjustInputValue(input, isIncrement);
          }
        }
      });
    });
  }

  private adjustInputValue(input: HTMLInputElement, increment: boolean): void {
    const currentValue = parseInt(input.value) || 0;
    const min = parseInt(input.min) || 0;
    const max = parseInt(input.max) || Infinity;
    const step = parseInt(input.step) || 1;
    
    let newValue = increment ? currentValue + step : currentValue - step;
    
    // Respect min/max bounds
    newValue = Math.max(min, Math.min(max, newValue));
    
    input.value = newValue.toString();
    
    // Trigger change event to notify other components
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}