/* Custom Preset Select Component */

class PresetSelect {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            presets: [
                { value: 'custom', label: 'Custom (manual)', description: 'Set your own sets and duration' },
                { value: 'presetWorkout', label: 'Preset Workout (8)', description: '8 bodyweight exercises' }
            ],
            defaultValue: 'custom',
            onChange: null,
            ...options
        };

        this.selectedValue = this.options.defaultValue;
        this.isOpen = false;
        this.element = null;
        this.dropdownElement = null;

        this.init();
    }

    init() {
        this.createElement();
        this.attachEventListeners();
    }

    createElement() {
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
        const originalSelect = container.querySelector('#presetSelect');
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

    getSelectHTML() {
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
    
    attachEventListeners() {
        if (!this.element) return;
        
        // Toggle dropdown on click
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Handle keyboard navigation
        this.element.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Handle option selection
        this.dropdownElement.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-select-option');
            if (option) {
                const value = option.dataset.value;
                this.selectOption(value);
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.close();
            }
        });
        
        // Handle focus/blur
        this.element.addEventListener('focus', () => {
            this.element.classList.add('focused');
        });
        
        this.element.addEventListener('blur', () => {
            this.element.classList.remove('focused');
        });
    }
    
    handleKeydown(e) {
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
    
    navigateOptions(direction) {
        const options = this.dropdownElement.querySelectorAll('.custom-select-option');
        const currentIndex = Array.from(options).findIndex(opt => opt.classList.contains('focused'));
        let newIndex;
        
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
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.isOpen) return;
        
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
            this.dropdownElement.style.opacity = '1';
            this.dropdownElement.style.transform = 'translateY(0) scale(1)';
        });
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.element.classList.remove('open');
        
        // Animation timing
        this.dropdownElement.style.opacity = '0';
        this.dropdownElement.style.transform = 'translateY(-8px) scale(0.95)';
        
        setTimeout(() => {
            this.dropdownElement.classList.remove('open');
            // Remove focused state from options
            this.dropdownElement.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('focused');
            });
        }, 150);
    }
    
    selectOption(value) {
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
        if (this.options.onChange && typeof this.options.onChange === 'function') {
            this.options.onChange(value, oldValue);
        }
        
        // Dispatch custom event for backward compatibility
        const event = new CustomEvent('presetSelectChange', {
            detail: { value, oldValue }
        });
        this.element.dispatchEvent(event);
    }
    
    updateDisplay() {
        const selectedPreset = this.options.presets.find(p => p.value === this.selectedValue);
        if (!selectedPreset) return;
        
        // Update trigger content
        const labelElement = this.element.querySelector('.custom-select-label');
        const descriptionElement = this.element.querySelector('.custom-select-description');
        
        if (labelElement) labelElement.textContent = selectedPreset.label;
        if (descriptionElement) descriptionElement.textContent = selectedPreset.description;
        
        // Update options
        this.dropdownElement.querySelectorAll('.custom-select-option').forEach(option => {
            const isSelected = option.dataset.value === this.selectedValue;
            option.classList.toggle('selected', isSelected);
            
            // Update checkmark
            const existingCheckmark = option.querySelector('.custom-select-checkmark');
            if (isSelected && !existingCheckmark) {
                const checkmark = document.createElement('div');
                checkmark.className = 'custom-select-checkmark';
                checkmark.textContent = '✓';
                option.appendChild(checkmark);
            } else if (!isSelected && existingCheckmark) {
                existingCheckmark.remove();
            }
        });
    }
    
    getValue() {
        return this.selectedValue;
    }
    
    setValue(value) {
        const preset = this.options.presets.find(p => p.value === value);
        if (preset) {
            this.selectOption(value);
        }
    }
    
    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
}

// Export for use in other modules
window.PresetSelect = PresetSelect;