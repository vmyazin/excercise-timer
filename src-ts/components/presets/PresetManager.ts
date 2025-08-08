// src-ts/components/presets/PresetManager.ts
import type { PresetWorkout, PresetMode, PresetState } from '../../types/preset.js';
import { PresetSelect } from '../ui/PresetSelect.js';

export class PresetManager {
  private state: PresetState;
  private presetWorkouts: Record<string, PresetWorkout>;
  private presetSelect: PresetSelect | null = null;

  constructor() {
    this.state = {
      activeMode: 'custom',
      activeExcerciseNames: null
    };

    this.presetWorkouts = {
      presetWorkout: {
        name: 'Preset Workout',
        excercises: [
          "Push-ups (standard or knees)",
          "Downward dog to upward dog flow (slow breaths)",
          "Bodyweight squats",
          "Forearm plank",
          "Prone Y-T raises (face down, lift arms in Y then T, light squeezes)",
          "Glute bridge",
          "Toe touch to overhead reach (hamstring to extension)",
          "Standing hip openers (slow knee circles)"
        ],
        restEnabled: true,
        restDuration: 5
      }
    };
  }

  public initialize(): void {
    const setsInput = document.getElementById("sets") as HTMLInputElement;

    // Initialize custom preset select component
    try {
      this.presetSelect = new PresetSelect("presetSelectContainer", {
        presets: [
          { 
            value: 'custom', 
            label: 'Default', 
            description: 'Set your own sets and duration' 
          },
          { 
            value: 'presetWorkout', 
            label: 'Preset Workout (8)', 
            description: '8 bodyweight exercises' 
          }
        ],
        defaultValue: 'custom',
        onChange: (value: string) => {
          this.handlePresetChange(value as PresetMode, setsInput);
        }
      });
    } catch (error) {
      console.error('Failed to initialize custom preset select:', error);
      // Fallback to original select
      const originalSelect = document.getElementById("presetSelect") as HTMLSelectElement;
      if (originalSelect) {
        originalSelect.style.display = 'block';
        originalSelect.addEventListener("change", (e) => {
          const target = e.target as HTMLSelectElement;
          this.handlePresetChange(target.value as PresetMode, setsInput);
        });
      }
    }
  }

  private handlePresetChange(mode: PresetMode, setsInput: HTMLInputElement): void {
    this.state.activeMode = mode;
    
    if (mode === "presetWorkout" && this.presetWorkouts.presetWorkout) {
      const preset = this.presetWorkouts.presetWorkout;
      this.state.activeExcerciseNames = [...preset.excercises];
      
          if (setsInput) {
      setsInput.value = String(this.state.activeExcerciseNames.length);
      }
      
      // Apply preset rest configuration if available
      if (preset.restEnabled !== undefined) {
        const enableRestCheckbox = document.getElementById("enableRest") as HTMLInputElement;
        const restDurationInput = document.getElementById("restDuration") as HTMLInputElement;
        const restDurationWrapper = document.querySelector(".rest-duration-wrapper") as HTMLElement;
        
        if (enableRestCheckbox) {
          enableRestCheckbox.checked = preset.restEnabled;
          
          // Update visibility of rest duration input
          if (preset.restEnabled) {
            restDurationWrapper?.classList.remove("hidden");
          } else {
            restDurationWrapper?.classList.add("hidden");
          }
        }
        
        if (restDurationInput && preset.restDuration) {
          restDurationInput.value = String(preset.restDuration);
        }
      }
    } else {
      this.state.activeExcerciseNames = null;
    }

    this.notifyPreviewUpdate();
  }

  private notifyPreviewUpdate(): void {
    const event = new CustomEvent('presetChanged', {
      detail: { activeExcerciseNames: this.state.activeExcerciseNames }
    });
    document.dispatchEvent(event);
  }

  public getActiveExcerciseNames(): string[] | null {
    return this.state.activeExcerciseNames;
  }

  public getActiveMode(): PresetMode {
    return this.state.activeMode;
  }

  public addPreset(key: string, preset: PresetWorkout): void {
    this.presetWorkouts[key] = preset;
  }

  public getPreset(key: string): PresetWorkout | undefined {
    return this.presetWorkouts[key];
  }

  public getAllPresets(): Record<string, PresetWorkout> {
    return { ...this.presetWorkouts };
  }
}