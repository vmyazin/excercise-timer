/* excercise-timer/src/main.js */
const { invoke } = window.__TAURI__.core;

let greetInputEl;
let greetMsgEl;

async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}

window.addEventListener("DOMContentLoaded", () => {
    greetInputEl = document.querySelector("#greet-input");
    greetMsgEl = document.querySelector("#greet-msg");
    const greetForm = document.querySelector("#greet-form");
    if (greetForm && greetInputEl && greetMsgEl) {
        greetForm.addEventListener("submit", (e) => {
            e.preventDefault();
            greet();
        });
    }
});

// Timer logic extracted from index.html
(function attachExcerciseTimer() {
    let timerInterval;
    let currentStep = 0;
    let timeRemaining = 0;
    let totalSteps = 0;
    let stepDuration = 0;
    let isRunning = false;
    let audioContext;
    let hasPlayedWarning = false;
    const countdownBeeps = new Set();
    let isWarmUp = false;
    let warmUpEnabled = false;
    let warmUpDuration = 5;

    // 🫣 Suggested component-like: preset model and selection controller
    const presetWorkout = [
        "Push-ups (standard or knees)",
        "Downward dog to upward dog flow (slow breaths)",
        "Bodyweight squats",
        "Forearm plank",
        "Prone Y-T raises (face down, lift arms in Y then T, light squeezes)",
        "Glute bridge",
        "Toe touch to overhead reach (hamstring to extension)",
        "Standing hip openers (slow knee circles)"
    ];

    let activeExcerciseNames = null; // null means manual/custom mode

    // Add event listeners for checkbox and warmup duration and presets
    window.addEventListener("DOMContentLoaded", () => {
        const enableWarmupCheckbox = document.getElementById("enableWarmup");
        const warmupDurationInput = document.getElementById("warmupDuration");
        const warmupDurationWrapper = document.querySelector(".warmup-duration-wrapper");
        const presetSelect = document.getElementById("presetSelect");
        const stepsInput = document.getElementById("steps");

        // Initialize warmup duration state
        if (!enableWarmupCheckbox.checked) {
            warmupDurationWrapper.classList.add("hidden");
        }

        // Handle checkbox toggle
        enableWarmupCheckbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                warmupDurationWrapper.classList.remove("hidden");
            } else {
                warmupDurationWrapper.classList.add("hidden");
            }
        });

        // Handle preset selection
        if (presetSelect) {
            presetSelect.addEventListener("change", (e) => {
                const value = e.target.value;
                if (value === "presetWorkout") {
                    activeExcerciseNames = [...presetWorkout];
                    stepsInput.value = String(activeExcerciseNames.length);
                } else {
                    activeExcerciseNames = null; // custom mode
                }
                renderUpcomingExcercisesPreview();
            });
        }

        // Initialize preview state on load
        renderUpcomingExcercisesPreview();
    });

    function initAudio() {
        if (!audioContext) {
            audioContext = new(window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playBeep(frequency = 800, duration = 200) {
        initAudio();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + duration / 1000
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
    }

    function getCurrentExcerciseName() {
        if (!activeExcerciseNames || isWarmUp || currentStep <= 0) return null;
        const index = currentStep - 1; // steps are 1-indexed in UI
        if (index >= 0 && index < activeExcerciseNames.length) {
            return activeExcerciseNames[index];
        }
        return null;
    }

    function renderUpcomingExcercisesPreview() {
        // For now, we reuse #progressInfo during setup to show the list
        const progressInfoEl = document.getElementById("progressInfo");
        const setupSection = document.getElementById("setupSection");
        if (!progressInfoEl || !setupSection) return;

        const isSetupVisible = !setupSection.classList.contains("hidden");
        if (!isSetupVisible) return;

        if (activeExcerciseNames && activeExcerciseNames.length) {
            progressInfoEl.textContent = `Preset loaded: ${activeExcerciseNames.length} steps`;
        } else {
            progressInfoEl.textContent = "";
        }
    }

    function updateDisplay() {
        const timeDisplayEl = document.getElementById("timeDisplay");
        const currentStepEl = document.getElementById("currentStep");
        const progressInfoEl = document.getElementById("progressInfo");
        const progressFillEl = document.getElementById("progressFill");
        const timerDisplayEl = document.getElementById("timerDisplay");

        timeDisplayEl.textContent = formatTime(timeRemaining);

        if (isWarmUp) {
            currentStepEl.textContent = "Warm Up";
            progressInfoEl.textContent = "Get ready to start!";
            timerDisplayEl.classList.add("warm-up");
        } else {
            const excerciseName = getCurrentExcerciseName();
            currentStepEl.textContent = excerciseName ?
                `${excerciseName}` :
                `Step ${currentStep} of ${totalSteps}`;
            const remainingSteps = Math.max(totalSteps - currentStep, 0);
            const suffix = activeExcerciseNames && !excerciseName ? " (custom)" : "";
            progressInfoEl.textContent = `${remainingSteps} steps remaining${suffix}`;
            timerDisplayEl.classList.remove("warm-up");
        }

        let stepProgress;
        if (isWarmUp) {
            stepProgress = ((warmUpDuration - timeRemaining) / warmUpDuration) * 100;
        } else {
            stepProgress = ((stepDuration - timeRemaining) / stepDuration) * 100;
        }
        progressFillEl.style.width = `${stepProgress}%`;

        if (timeRemaining <= 3 && timeRemaining > 0) {
            timerDisplayEl.classList.add("warning");
            if (!countdownBeeps.has(timeRemaining)) {
                playBeep(1000, 300);
                countdownBeeps.add(timeRemaining);
            }
        } else {
            timerDisplayEl.classList.remove("warning");
        }
    }

    function startTimer() {
        const stepsInput = document.getElementById("steps");
        const durationInput = document.getElementById("duration");
        const enableWarmupCheckbox = document.getElementById("enableWarmup");
        const warmupDurationInput = document.getElementById("warmupDuration");

        // If a preset is active, respect its length for total steps
        const presetSteps = activeExcerciseNames ? activeExcerciseNames.length : null;

        totalSteps = parseInt(stepsInput.value);
        stepDuration = parseInt(durationInput.value);
        warmUpEnabled = enableWarmupCheckbox.checked;
        warmUpDuration = parseInt(warmupDurationInput.value);

        if (presetSteps != null) {
            totalSteps = presetSteps;
        }

        currentStep = 0;
        isRunning = true;
        hasPlayedWarning = false;
        countdownBeeps.clear();

        // Set initial state based on warm-up preference
        if (warmUpEnabled) {
            isWarmUp = true;
            timeRemaining = warmUpDuration;
        } else {
            isWarmUp = false;
            currentStep = 1;
            timeRemaining = stepDuration;
        }

        document.getElementById("setupSection").classList.add("hidden");
        document.getElementById("stopBtn").classList.remove("hidden");

        initAudio();

        updateDisplay();

        timerInterval = setInterval(() => {
            timeRemaining--;
            updateDisplay();

            if (timeRemaining <= 0) {
                if (isWarmUp) {
                    playBeep(1200, 500);
                    isWarmUp = false;
                    currentStep = 1;
                    timeRemaining = stepDuration;
                    countdownBeeps.clear();

                    setTimeout(() => {
                        document.getElementById("timerDisplay").classList.remove("warm-up");
                    }, 500);
                } else {
                    playBeep(1200, 500);

                    if (currentStep < totalSteps) {
                        currentStep++;
                        timeRemaining = stepDuration;
                        hasPlayedWarning = false;
                        countdownBeeps.clear();

                        document
                            .getElementById("timerDisplay")
                            .classList.add("step-complete");
                        setTimeout(() => {
                            document
                                .getElementById("timerDisplay")
                                .classList.remove("step-complete");
                        }, 1000);
                    } else {
                        completeTimer();
                    }
                }
            }
        }, 1000);
    }

    function completeTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        playBeep(800, 200);
        setTimeout(() => playBeep(1000, 200), 300);
        setTimeout(() => playBeep(1200, 400), 600);

        document.getElementById("currentStep").textContent = "Workout Complete!";
        document.getElementById("timeDisplay").textContent = "DONE";
        document.getElementById("progressInfo").textContent = "Great job! 🎉";
        document.getElementById("progressFill").style.width = "100%";
        document.getElementById("timerDisplay").classList.add("all-complete");

        setTimeout(() => {
            resetTimer();
        }, 3000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        resetTimer();
    }

    function resetTimer() {
        isRunning = false;
        isWarmUp = false;
        currentStep = 0;
        timeRemaining = 0;
        hasPlayedWarning = false;
        countdownBeeps.clear();

        document.getElementById("setupSection").classList.remove("hidden");
        document.getElementById("stopBtn").classList.add("hidden");
        document
            .getElementById("timerDisplay")
            .classList.remove("warning", "step-complete", "all-complete", "warm-up");

        document.getElementById("currentStep").textContent = "Ready to Start";
        document.getElementById("timeDisplay").textContent = "00:00";
        document.getElementById("progressInfo").textContent = "";
        document.getElementById("progressFill").style.width = "0%";

        // Re-render preview after reset in case user changes presets
        renderUpcomingExcercisesPreview();
    }

    document.addEventListener("click", initAudio, { once: true });

    window.startTimer = startTimer;
    window.stopTimer = stopTimer;
})();