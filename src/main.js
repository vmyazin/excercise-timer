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
    let currentSet = 0;
    let timeRemaining = 0;
    let totalSets = 0;
    let setDuration = 0;
    let isRunning = false;
    let audioContext;
    let hasPlayedWarning = false;
    const countdownBeeps = new Set();
    let isWarmUp = false;
    let warmUpEnabled = false;
    let warmUpDuration = 10;
    let isRest = false;
    let restEnabled = false;
    let restDuration = 5;

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

    // Initialize custom preset select component
    let presetSelectComponent = null;

    // Add event listeners for checkbox and warmup duration and presets
    window.addEventListener("DOMContentLoaded", () => {
        const enableWarmupCheckbox = document.getElementById("enableWarmup");
        const warmupDurationWrapper = document.querySelector(".warmup-duration-wrapper");
        const setsInput = document.getElementById("sets");

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

        // Add rest time handling
        const enableRestCheckbox = document.getElementById("enableRest");
        const restDurationWrapper = document.querySelector(".rest-duration-wrapper");

        // Initialize rest duration state
        if (!enableRestCheckbox.checked) {
            restDurationWrapper.classList.add("hidden");
        }

        // Handle rest checkbox toggle
        enableRestCheckbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                restDurationWrapper.classList.remove("hidden");
            } else {
                restDurationWrapper.classList.add("hidden");
            }
        });

        // Initialize custom preset select with fallback
        try {
            presetSelectComponent = new PresetSelect("presetSelectContainer", {
                presets: [{
                        value: 'custom',
                        label: 'Custom (manual)',
                        description: 'Set your own sets and duration'
                    },
                    {
                        value: 'presetWorkout',
                        label: 'Preset Workout (8)',
                        description: '8 bodyweight exercises'
                    }
                ],
                defaultValue: 'custom',
                onChange: (value) => {
                    if (value === "presetWorkout") {
                        activeExcerciseNames = [...presetWorkout];
                        setsInput.value = String(activeExcerciseNames.length);
                    } else {
                        activeExcerciseNames = null; // custom mode
                    }
                    renderUpcomingExcercisesPreview();
                }
            });
        } catch (error) {
            console.error('Failed to initialize custom preset select:', error);
            // Fallback to original select
            const originalSelect = document.getElementById("presetSelect");
            if (originalSelect) {
                originalSelect.style.display = 'block';
                originalSelect.addEventListener("change", (e) => {
                    const value = e.target.value;
                    if (value === "presetWorkout") {
                        activeExcerciseNames = [...presetWorkout];
                        setsInput.value = String(activeExcerciseNames.length);
                    } else {
                        activeExcerciseNames = null; // custom mode
                    }
                    renderUpcomingExcercisesPreview();
                });
            }
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
        if (!activeExcerciseNames || isWarmUp || currentSet <= 0) return null;
        const index = currentSet - 1; // sets are 1-indexed in UI
        if (index >= 0 && index < activeExcerciseNames.length) {
            return activeExcerciseNames[index];
        }
        return null;
    }

    function getNextExcerciseName() {
        if (!activeExcerciseNames || currentSet >= activeExcerciseNames.length) return null;
        const index = currentSet; // sets are 1-indexed in UI
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
            progressInfoEl.textContent = `Preset loaded: ${activeExcerciseNames.length} sets`;
        } else {
            progressInfoEl.textContent = "";
        }
    }

    function updateDisplay() {
        const timeDisplayEl = document.getElementById("timeDisplay");
        const currentSetEl = document.getElementById("currentSet");
        const progressInfoEl = document.getElementById("progressInfo");
        const progressFillEl = document.getElementById("progressFill");
        const timerDisplayEl = document.getElementById("timerDisplay");

        timeDisplayEl.textContent = formatTime(timeRemaining);

        if (isWarmUp) {
            currentSetEl.textContent = "Warm Up";
            progressInfoEl.textContent = "Get ready to start!";
            timerDisplayEl.classList.add("warm-up");
            timerDisplayEl.classList.remove("rest");
        } else if (isRest) {
            currentSetEl.textContent = "Rest";
            const nextSetNum = currentSet + 1;
            const nextExcerciseName = getNextExcerciseName();
            const nextSetDisplay = nextExcerciseName ? nextExcerciseName : `Set ${nextSetNum}`;
            progressInfoEl.textContent = `Next: ${nextSetDisplay}`;
            timerDisplayEl.classList.add("rest");
            timerDisplayEl.classList.remove("warm-up");
        } else {
            const excerciseName = getCurrentExcerciseName();
            currentSetEl.textContent = excerciseName ?
                `${excerciseName}` :
                `Set ${currentSet} of ${totalSets}`;
            const remainingSets = Math.max(totalSets - currentSet, 0);
            const suffix = activeExcerciseNames && !excerciseName ? " (custom)" : "";
            progressInfoEl.textContent = `${remainingSets} sets remaining${suffix}`;
            timerDisplayEl.classList.remove("warm-up", "rest");
        }

        let setProgress;
        if (isWarmUp) {
            setProgress = ((warmUpDuration - timeRemaining) / warmUpDuration) * 100;
        } else if (isRest) {
            setProgress = ((restDuration - timeRemaining) / restDuration) * 100;
        } else {
            setProgress = ((setDuration - timeRemaining) / setDuration) * 100;
        }
        progressFillEl.style.width = `${setProgress}%`;

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

    function setStopButtonMode(isNewWorkout) {
        const stopBtn = document.getElementById("stopBtn");
        if (!stopBtn) return;
        const textSpan = stopBtn.querySelector('.button-text');
        if (isNewWorkout) {
            stopBtn.classList.remove('stop-btn');
            stopBtn.classList.add('start-btn');
            if (textSpan) textSpan.textContent = 'New Workout';
        } else {
            stopBtn.classList.remove('start-btn');
            stopBtn.classList.add('stop-btn');
            if (textSpan) textSpan.textContent = 'Stop Timer';
        }
    }

    function startTimer() {
        const setsInput = document.getElementById("sets");
        const durationInput = document.getElementById("duration");
        const enableWarmupCheckbox = document.getElementById("enableWarmup");
        const warmupDurationInput = document.getElementById("warmupDuration");
        const enableRestCheckbox = document.getElementById("enableRest");
        const restDurationInput = document.getElementById("restDuration");

        // If a preset is active, respect its length for total sets
        const presetSets = activeExcerciseNames ? activeExcerciseNames.length : null;

        totalSets = parseInt(setsInput.value);
        setDuration = parseInt(durationInput.value);
        warmUpEnabled = enableWarmupCheckbox.checked;
        warmUpDuration = parseInt(warmupDurationInput.value);
        restEnabled = enableRestCheckbox.checked;
        restDuration = parseInt(restDurationInput.value);

        if (presetSets != null) {
            totalSets = presetSets;
        }

        currentSet = 0;
        isRunning = true;
        isRest = false;
        hasPlayedWarning = false;
        countdownBeeps.clear();

        // Set initial state based on warm-up preference
        if (warmUpEnabled) {
            isWarmUp = true;
            timeRemaining = warmUpDuration;
        } else {
            isWarmUp = false;
            currentSet = 1;
            timeRemaining = setDuration;
        }

        // Ensure Stop button is default red mode on start
        setStopButtonMode(false);

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
                    currentSet = 1;
                    timeRemaining = setDuration;
                    countdownBeeps.clear();

                    setTimeout(() => {
                        document.getElementById("timerDisplay").classList.remove("warm-up");
                    }, 500);
                } else if (isRest) {
                    playBeep(1200, 500);
                    isRest = false;
                    currentSet++;
                    timeRemaining = setDuration;
                    hasPlayedWarning = false;
                    countdownBeeps.clear();
                } else {
                    playBeep(1200, 500);

                    if (currentSet < totalSets) {
                        // Check if we should start a rest period
                        if (restEnabled && currentSet < totalSets) {
                            isRest = true;
                            timeRemaining = restDuration;
                            hasPlayedWarning = false;
                            countdownBeeps.clear();

                            document
                                .getElementById("timerDisplay")
                                .classList.add("set-complete");
                            setTimeout(() => {
                                document
                                    .getElementById("timerDisplay")
                                    .classList.remove("set-complete");
                            }, 1000);
                        } else {
                            // No rest, go directly to next set
                            currentSet++;
                            timeRemaining = setDuration;
                            hasPlayedWarning = false;
                            countdownBeeps.clear();

                            document
                                .getElementById("timerDisplay")
                                .classList.add("set-complete");
                            setTimeout(() => {
                                document
                                    .getElementById("timerDisplay")
                                    .classList.remove("set-complete");
                            }, 1000);
                        }
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

        document.getElementById("currentSet").textContent = "Workout Complete!";
        document.getElementById("timeDisplay").textContent = "DONE";
        document.getElementById("progressInfo").textContent = "Great job! 🎉";
        document.getElementById("progressFill").style.width = "100%";
        document.getElementById("timerDisplay").classList.add("all-complete");

        // Swap Stop -> New Workout (blue) and wait for user input
        setStopButtonMode(true);
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
        currentSet = 0;
        timeRemaining = 0;
        hasPlayedWarning = false;
        countdownBeeps.clear();

        document.getElementById("setupSection").classList.remove("hidden");
        document.getElementById("stopBtn").classList.add("hidden");
        document
            .getElementById("timerDisplay")
            .classList.remove("warning", "set-complete", "all-complete", "warm-up");

        document.getElementById("currentSet").textContent = "Ready to Start";
        document.getElementById("timeDisplay").textContent = "00:00";
        document.getElementById("progressInfo").textContent = "";
        document.getElementById("progressFill").style.width = "0%";

        // Restore Stop button default (red) for next run
        setStopButtonMode(false);

        // Re-render preview after reset in case user changes presets
        renderUpcomingExcercisesPreview();

        // Reset preset select if needed
        if (presetSelectComponent) {
            presetSelectComponent.close();
        }
    }

    document.addEventListener("click", initAudio, { once: true });

    window.startTimer = startTimer;
    window.stopTimer = stopTimer;
})();