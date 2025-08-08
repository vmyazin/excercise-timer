export class AudioManager {
  private audioContext: AudioContext | null = null;

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public playBeep(frequency: number = 800, duration: number = 200): void {
    this.initAudio();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration / 1000
    );
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration / 1000);
  }

  public playStepComplete(): void {
    this.playBeep(1200, 500);
  }

  public playWarning(): void {
    this.playBeep(1000, 300);
  }

  public playWorkoutComplete(): void {
    this.playBeep(800, 200);
    setTimeout(() => this.playBeep(1000, 200), 300);
    setTimeout(() => this.playBeep(1200, 400), 600);
  }
}