import { Timer } from './components/timer/Timer.js';
import { PresetManager } from './components/presets/PresetManager.js';
import { FormController } from './components/ui/FormController.js';
import { TauriService } from './services/TauriService.js';

class ExcerciseTimerApp {
  private timer: Timer;
  private presetManager: PresetManager;
  private formController: FormController;
  private tauriService: TauriService;

  constructor() {
    this.timer = new Timer();
    this.presetManager = new PresetManager();
    this.formController = new FormController();
    this.tauriService = new TauriService();
  }

  public initialize(): void {
    this.presetManager.initialize();
    this.formController.initialize();
    this.tauriService.initialize();

    document.addEventListener('presetChanged', (e: Event) => {
      const customEvent = e as CustomEvent;
      const { activeExcerciseNames } = customEvent.detail;
      this.timer.setActiveExcerciseNames(activeExcerciseNames);
    });

    this.setupGlobalFunctions();
  }

  private setupGlobalFunctions(): void {
    (window as any).startTimer = () => {
      if (!this.formController.validateForm()) return;
      
      const config = this.formController.getTimerConfig();
      const activeExcerciseNames = this.presetManager.getActiveExcerciseNames();
      
      this.timer.setActiveExcerciseNames(activeExcerciseNames);
      this.timer.start(config);
    };

    (window as any).stopTimer = () => {
      this.timer.stop();
    };

    (window as any).skipStep = () => {
      this.timer.skip();
    };
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new ExcerciseTimerApp();
  app.initialize();
});