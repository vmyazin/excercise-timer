import '../types/tauri.js';

export class TauriService {
  private greetInputEl: HTMLInputElement | null = null;
  private greetMsgEl: HTMLElement | null = null;

  public initialize(): void {
    this.greetInputEl = document.querySelector("#greet-input");
    this.greetMsgEl = document.querySelector("#greet-msg");
    
    const greetForm = document.querySelector("#greet-form");
    if (greetForm && this.greetInputEl && this.greetMsgEl) {
      greetForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.greet();
      });
    }
  }

  private async greet(): Promise<void> {
    if (!this.greetInputEl || !this.greetMsgEl) return;
    
    try {
      const response = await window.__TAURI__.core.invoke("greet", { 
        name: this.greetInputEl.value 
      });
      this.greetMsgEl.textContent = response;
    } catch (error) {
      console.error("Failed to greet:", error);
      this.greetMsgEl.textContent = "Error: Failed to greet";
    }
  }
}