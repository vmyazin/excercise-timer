export interface TimerState {
  currentStep: number;
  timeRemaining: number;
  totalSteps: number;
  stepDuration: number;
  isRunning: boolean;
  isWarmUp: boolean;
  isRest: boolean;
  warmUpEnabled: boolean;
  warmUpDuration: number;
  restEnabled: boolean;
  restDuration: number;
  hasPlayedWarning: boolean;
}

export interface TimerConfig {
  steps: number;
  duration: number;
  warmUpEnabled: boolean;
  warmUpDuration: number;
  restEnabled: boolean;
  restDuration: number;
}

export interface TimerDisplay {
  currentStep: string;
  timeDisplay: string;
  progressInfo: string;
  progressPercent: number;
}

export type TimerEventType = 'stepComplete' | 'warmUpComplete' | 'timerComplete' | 'warning';