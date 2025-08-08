export interface PresetWorkout {
  name: string;
  excercises: string[];
}

export type PresetMode = 'custom' | 'presetWorkout';

export interface PresetState {
  activeMode: PresetMode;
  activeExcerciseNames: string[] | null;
}