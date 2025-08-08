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
        ]
      }
    };
  }

  public initialize(): void {
    const stepsInput = document.getElementById("steps") as HTMLInputElement;

    // Initialize custom preset select component
    try {
      this.presetSelect = new PresetSelect("presetSelectContainer", {
        presets: [
          { 
            value: 'custom', 
            label: 'Default', 
            description: 'Set your own steps and duration' 
          },
          { 
            value: 'presetWorkout', 
            label: 'Preset Workout (8)', 
            description: '8 bodyweight exercises' 
          }
        ],
        defaultValue: 'custom',
        onChange: (value: string) => {
          this.handlePresetChange(value as PresetMode, stepsInput);
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
          this.handlePresetChange(target.value as PresetMode, stepsInput);
        });
      }
    }
  }

  private handlePresetChange(mode: PresetMode, stepsInput: HTMLInputElement): void {
    this.state.activeMode = mode;
    
    if (mode === "presetWorkout" && this.presetWorkouts.presetWorkout) {
      this.state.activeExcerciseNames = [...this.presetWorkouts.presetWorkout.excercises];
      if (stepsInput) {
        stepsInput.value = String(this.state.activeExcerciseNames.length);
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