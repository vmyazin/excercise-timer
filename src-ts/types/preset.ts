export interface PresetWorkout {
  name: string;
  excercises: string[];
  restEnabled?: boolean;
  restDuration?: number;
}

export type PresetMode = 'custom' | 'presetWorkout';

export interface PresetState {
  activeMode: PresetMode;
  activeExcerciseNames: string[] | null;
}