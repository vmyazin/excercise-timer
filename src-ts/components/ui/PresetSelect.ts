// src-ts/components/ui/PresetSelect.ts
interface PresetOption {
  value: string;
  label: string;
  description: string;
}

interface PresetSelectOptions {
  presets: PresetOption[];
  defaultValue: string;
  onChange?: (value: string, oldValue: string) => void;
}

export class PresetSelect {
  private containerId: string;
  private options: PresetSelectOptions;
  private selectedValue: string;
  private isOpen: boolean = false;
  private element: HTMLElement | null = null;
  private dropdownElement: HTMLElement | null = null;

  constructor(containerId: string, options: PresetSelectOptions) {
    this.containerId = containerId;
    
    // Set default options, then override with provided options
    const defaultOptions: PresetSelectOptions = {
      presets: [
        { value: 'custom', label: 'Default', description: 'Set your own' },
        { value: 'presetWorkout', label: 'Preset Workout (8)', description: '8 bodyweight exercises' }
      ],
      defaultValue: 'custom'
    };
    
    this.options = {
      ...defaultOptions,
      ...options
    };
    
    this.selectedValue = this.options.defaultValue;
    this.init();
  }

  private init(): void {
    this.createElement();
    this.attachEventListeners();
  }

  private createElement(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`PresetSelect: Container with ID "${this.containerId}" not found`);
      return;
    }

    // Create the custom select structure
    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'custom-select-wrapper';
    selectWrapper.innerHTML = this.getSelectHTML();

    // Replace the original select or append to container
    const originalSelect = container.querySelector('#presetSelect') as HTMLSelectElement;
    if (originalSelect) {
      // Hide the original select and add our custom component
      originalSelect.style.display = 'none';
      container.appendChild(selectWrapper);
    } else {
      // Add our component to the container
      container.appendChild(selectWrapper);
    }

    this.element = selectWrapper.querySelector('.custom-select');
    this.dropdownElement = selectWrapper.querySelector('.custom-select-dropdown');

    if (!this.element || !this.dropdownElement) {
      console.error('PresetSelect: Failed to create component elements');
    }
  }

  private getSelectHTML(): string {
    const selectedPreset = this.options.presets.find(p => p.value === this.selectedValue);

    return `
      <div class="custom-select" tabindex="0">
        <div class="custom-select-trigger">
          <div class="custom-select-content">
            <span class="custom-select-label">${selectedPreset?.label || 'Select preset'}</span>
            <span class="custom-select-description">${selectedPreset?.description || ''}</span>
          </div>
          <div class="custom-select-arrow">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="custom-select-dropdown">
          ${this.options.presets.map(preset => `
            <div class="custom-select-option ${preset.value === this.selectedValue ? 'selected' : ''}" 
                 data-value="${preset.value}">
              <div class="custom-select-option-content">
                <span class="custom-select-option-label">${preset.label}</span>
                <span class="custom-select-option-description">${preset.description}</span>
              </div>
              ${preset.value === this.selectedValue ? '<div class="custom-select-checkmark">✓</div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.element || !this.dropdownElement) return;

    // Toggle dropdown only when clicking the trigger (not when clicking options)
    this.element.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const isTriggerClick = !!target.closest('.custom-select-trigger');
      if (!isTriggerClick) return;
      e.stopPropagation();
      this.toggle();
    });

    // Handle keyboard navigation
    this.element.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeydown(e);
    });

    // Handle option selection
    this.dropdownElement.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const option = (e.target as HTMLElement).closest('.custom-select-option') as HTMLElement;
      if (option) {
        const value = option.dataset.value;
        if (value) this.selectOption(value);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e: Event) => {
      if (this.element && !this.element.contains(e.target as Node)) {
        this.close();
      }
    });

    // Handle focus/blur
    this.element.addEventListener('focus', () => {
      this.element?.classList.add('focused');
    });

    this.element.addEventListener('blur', () => {
      this.element?.classList.remove('focused');
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.toggle();
        break;
      case 'Escape':
        this.close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (this.isOpen) {
          this.navigateOptions(1);
        } else {
          this.open();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (this.isOpen) {
          this.navigateOptions(-1);
        } else {
          this.open();
        }
        break;
    }
  }

  private navigateOptions(direction: number): void {
    if (!this.dropdownElement) return;

    const options = this.dropdownElement.querySelectorAll('.custom-select-option');
    const currentIndex = Array.from(options).findIndex(opt => opt.classList.contains('focused'));
    let newIndex: number;

    if (currentIndex === -1) {
      newIndex = direction > 0 ? 0 : options.length - 1;
    } else {
      newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = options.length - 1;
      if (newIndex >= options.length) newIndex = 0;
    }

    // Remove focus from current option
    options.forEach(opt => opt.classList.remove('focused'));

    // Add focus to new option
    if (options[newIndex]) {
      options[newIndex].classList.add('focused');
      options[newIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    if (this.isOpen || !this.element || !this.dropdownElement) return;

    this.isOpen = true;
    this.element.classList.add('open');
    this.dropdownElement.classList.add('open');

    // Focus the selected option
    const selectedOption = this.dropdownElement.querySelector('.custom-select-option.selected');
    if (selectedOption) {
      selectedOption.classList.add('focused');
    }

    // Animation timing
    requestAnimationFrame(() => {
      if (this.dropdownElement) {
        this.dropdownElement.style.opacity = '1';
        this.dropdownElement.style.transform = 'translateY(0) scale(1)';
      }
    });
  }

  private close(): void {
    if (!this.isOpen || !this.element || !this.dropdownElement) return;

    this.isOpen = false;
    this.element.classList.remove('open');

    // Animation timing
    this.dropdownElement.style.opacity = '0';
    this.dropdownElement.style.transform = 'translateY(-8px) scale(0.95)';

    setTimeout(() => {
      this.dropdownElement?.classList.remove('open');
      // Remove focused state from options
      this.dropdownElement?.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('focused');
      });
    }, 150);
  }

  private selectOption(value: string): void {
    if (value === this.selectedValue) {
      this.close();
      return;
    }

    const oldValue = this.selectedValue;
    this.selectedValue = value;

    // Update the display
    this.updateDisplay();

    // Close dropdown
    this.close();

    // Trigger change event
    if (this.options.onChange) {
      this.options.onChange(value, oldValue);
    }

    // Dispatch custom event for backward compatibility
    if (this.element) {
      const event = new CustomEvent('presetSelectChange', {
        detail: { value, oldValue }
      });
      this.element.dispatchEvent(event);
    }
  }

  private updateDisplay(): void {
    const selectedPreset = this.options.presets.find(p => p.value === this.selectedValue);
    if (!selectedPreset || !this.element || !this.dropdownElement) return;

    // Update trigger content
    const labelElement = this.element.querySelector('.custom-select-label') as HTMLElement;
    const descriptionElement = this.element.querySelector('.custom-select-description') as HTMLElement;

    if (labelElement) labelElement.textContent = selectedPreset.label;
    if (descriptionElement) descriptionElement.textContent = selectedPreset.description;

    // Update options
    this.dropdownElement.querySelectorAll('.custom-select-option').forEach(option => {
      const optionElement = option as HTMLElement;
      const isSelected = optionElement.dataset.value === this.selectedValue;
      optionElement.classList.toggle('selected', isSelected);

      // Update checkmark
      const existingCheckmark = optionElement.querySelector('.custom-select-checkmark');
      if (isSelected && !existingCheckmark) {
        const checkmark = document.createElement('div');
        checkmark.className = 'custom-select-checkmark';
        checkmark.textContent = '✓';
        optionElement.appendChild(checkmark);
      } else if (!isSelected && existingCheckmark) {
        existingCheckmark.remove();
      }
    });
  }

  public getValue(): string {
    return this.selectedValue;
  }

  public setValue(value: string): void {
    const preset = this.options.presets.find(p => p.value === value);
    if (preset) {
      this.selectOption(value);
    }
  }

  public forceClose(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  public destroy(): void {
    if (this.element) {
      this.element.remove();
    }
  }
}