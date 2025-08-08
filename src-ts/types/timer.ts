export interface TimerState {
  currentStep: number;
  timeRemaining: number;
  totalSteps: number;
  stepDuration: number;
  isRunning: boolean;
  isWarmUp: boolean;
  warmUpEnabled: boolean;
  warmUpDuration: number;
  hasPlayedWarning: boolean;
}

export interface TimerConfig {
  steps: number;
  duration: number;
  warmUpEnabled: boolean;
  warmUpDuration: number;
}

export interface TimerDisplay {
  currentStep: string;
  timeDisplay: string;
  progressInfo: string;
  progressPercent: number;
}

export type TimerEventType = 'stepComplete' | 'warmUpComplete' | 'timerComplete' | 'warning';