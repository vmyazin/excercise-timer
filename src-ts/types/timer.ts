// src-ts/types/timer.ts
export interface TimerState {
  currentSet: number;
  timeRemaining: number;
  totalSets: number;
  setDuration: number;
  isRunning: boolean;
  isWarmUp: boolean;
  isRest: boolean;
  warmUpEnabled: boolean;
  warmUpDuration: number;
  restEnabled: boolean;
  restDuration: number;
}

export interface TimerConfig {
    sets: number;
    duration: number;
  warmUpEnabled: boolean;
  warmUpDuration: number;
  restEnabled: boolean;
  restDuration: number;
}

export interface TimerDisplay {
    currentSet: string;
  timeDisplay: string;
  progressInfo: string;
  progressPercent: number;
}

export type TimerEventType = 'setComplete' | 'warmUpComplete' | 'timerComplete' | 'warning';