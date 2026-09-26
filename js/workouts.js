/**
 * Fitness Tracker - Workout Logger, History & Live Timer Controller
 */

const Workouts = {
    timerInterval: null,
    timerSeconds: 0,
    timerRunning: false,

    // MET values for automatic calorie burn calculation
    EXERCISE_METS: {
        'Running': 9.8,
        'Cycling': 7.5,
        'Strength Training': 6.0,
        'HIIT': 8.5,
        'Yoga': 3.0,
        'Swimming': 8.0,
        'Walking': 3.8,
        'Boxing': 8.0,
        'Pilates': 3.5,
        'Custom': 5.5
    },

    init() {
        this.bindEvents();
        this.initStopwatch();
    },

    bindEvents() {
        // Exercise Type change -> calculate estimated calories
        const typeSelect = document.getElementById('wo-type');
        const durationInput = document.getElementById('wo-duration');
        const intensitySelect = document.getElementById('wo-intensity');

        [typeSelect, durationInput, intensitySelect].forEach(el => {
            if (el) {
                el.addEventListener('input', () => this.updateEstimatedCalories());
            }
        });

        // Workout Form Submit
        const form = document.getElementById('form-log-workout');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveWorkout();
            });
        }

        // Filter Category change
        const filterSelect = document.getElementById('wo-filter-category');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.renderList());
        }

        // Search Input
        const searchInput = document.getElementById('wo-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.renderList());
        }
    },

    updateEstimatedCalories() {
        const type = document.getElementById('wo-type')?.value || 'Running';
        const duration = Number(document.getElementById('wo-duration')?.value) || 30;
        const intensity = document.getElementById('wo-intensity')?.value || 'Medium';
        const calInput = document.getElementById('wo-calories');

        const user = Store.getCurrentUser();
        const weightKg = user ? user.weight : 70;

        const baseMet = this.EXERCISE_METS[type] || 6.0;
        let intensityFactor = 1.0;
        if (intensity === 'Low') intensityFactor = 0.85;
        if (intensity === 'High') intensityFactor = 1.25;

        // Calories burned = (MET * 3.5 * weightKg / 200) * durationMinutes * intensityFactor
        const estimated = Math.round((baseMet * 3.5 * weightKg / 200) * duration * intensityFactor);

        if (calInput) {
            calInput.value = estimated;
        }
    },

    handleSaveWorkout() {
        const type = document.getElementById('wo-type').value;
        const category = document.getElementById('wo-category').value;
        const duration = Number(document.getElementById('wo-duration').value);
        const calories = Number(document.getElementById('wo-calories').value);
        const intensity = document.getElementById('wo-intensity').value;
        const distance = document.getElementById('wo-distance').value;
        const notes = document.getElementById('wo-notes').value;
        const date = document.getElementById('wo-date').value || Utils.getTodayStr();

        if (!duration || duration <= 0) {
            Utils.showToast('Please enter a valid workout duration', 'warning');
            return;
        }

        Store.addWorkout({
            type,
            category,
            durationMinutes: duration,
            caloriesBurned: calories,
            intensity,
            distanceKm: distance ? Number(distance) : null,
            notes,
            date
        });

        Utils.playAudioFeedback('success');
        Utils.showToast(`Logged: ${type} (${calories} kcal burned)! 🔥`, 'success');

        // Close modal
        if (window.App) window.App.closeModal('modal-log-workout');

        // Reset form
        document.getElementById('form-log-workout').reset();
        document.getElementById('wo-date').value = Utils.getTodayStr();

        this.render();
        if (window.Dashboard) window.Dashboard.render();
    },

    // --- Live Stopwatch Timer ---
    initStopwatch() {
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');
        const resetBtn = document.getElementById('timer-reset');
        const finishBtn = document.getElementById('timer-finish');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startTimer());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseTimer());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetTimer());
        }
        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.finishTimer());
        }
    },

    startTimer() {
        if (this.timerRunning) return;
        this.timerRunning = true;
        Utils.playAudioFeedback('beep');

        const display = document.getElementById('timer-display');
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');

        if (startBtn) startBtn.classList.add('hidden');
        if (pauseBtn) pauseBtn.classList.remove('hidden');

        this.timerInterval = setInterval(() => {
            this.timerSeconds++;
            const mins = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
            const secs = String(this.timerSeconds % 60).padStart(2, '0');
            if (display) display.textContent = `${mins}:${secs}`;
        }, 1000);
    },

    pauseTimer() {
        if (!this.timerRunning) return;
        this.timerRunning = false;
        clearInterval(this.timerInterval);

        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');

        if (startBtn) startBtn.classList.remove('hidden');
        if (pauseBtn) pauseBtn.classList.add('hidden');
    },

    resetTimer() {
        this.pauseTimer();
        this.timerSeconds = 0;
        const display = document.getElementById('timer-display');
        if (display) display.textContent = '00:00';
    },

    finishTimer() {
        const elapsedMins = Math.max(1, Math.round(this.timerSeconds / 60));
        this.resetTimer();

        // Open workout modal with prefilled duration
        if (window.App) {
            window.App.openModal('modal-log-workout');
            const durInput = document.getElementById('wo-duration');
            if (durInput) {
                durInput.value = elapsedMins;
                this.updateEstimatedCalories();
            }
        }
        Utils.showToast(`Timer finished: ${elapsedMins} min session! Complete your log details.`, 'info');
    },

    // --- Render Workout View & History ---
    render() {
        this.renderStats();
        this.renderList();
    },

    renderStats() {
        const workouts = Store.getWorkouts();
        // Filter last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recent = workouts.filter(w => new Date(w.date) >= sevenDaysAgo);
        const totalWorkouts = recent.length;
        const totalMinutes = recent.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
        const totalCalories = recent.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

        const statWorkouts = document.getElementById('wo-stat-count');
        const statMins = document.getElementById('wo-stat-mins');
        const statCals = document.getElementById('wo-stat-cals');

        if (statWorkouts) statWorkouts.textContent = totalWorkouts;
        if (statMins) statMins.textContent = `${totalMinutes}m`;
        if (statCals) statCals.textContent = Utils.formatNumber(totalCalories);
    },

    renderList() {
        const container = document.getElementById('workouts-list');
        if (!container) return;

        let workouts = Store.getWorkouts();
        const categoryFilter = document.getElementById('wo-filter-category')?.value || 'all';
        const searchQuery = document.getElementById('wo-search')?.value.trim().toLowerCase() || '';

        if (categoryFilter !== 'all') {
            workouts = workouts.filter(w => w.category?.toLowerCase() === categoryFilter.toLowerCase());
        }

        if (searchQuery) {
            workouts = workouts.filter(w => 
                w.type.toLowerCase().includes(searchQuery) ||
                (w.notes && w.notes.toLowerCase().includes(searchQuery))
            );
        }

        if (workouts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏋️‍♂️</div>
                    <p>No workouts found.</p>
                    <span class="empty-hint">Start a workout with the live timer or log one manually!</span>
                </div>
            `;
            return;
        }

        container.innerHTML = workouts.map(w => `
            <div class="workout-card" data-id="${w.id}">
                <div class="workout-card-left">
                    <div class="workout-badge ${w.intensity === 'High' ? 'badge-high' : ''}">
                        ${w.category === 'Strength' ? '🏋️' : (w.category === 'Cycling' ? '🚴' : (w.category === 'HIIT' ? '⚡' : '🏃'))}
                    </div>
                    <div class="workout-info">
                        <div class="workout-name-row">
                            <span class="workout-name">${w.type}</span>
                            <span class="badge badge-subtle">${w.intensity} Intensity</span>
                        </div>
                        <div class="workout-sub">
                            <span>📅 ${Utils.formatDate(w.date)}</span>
                            <span>⏱ ${w.durationMinutes} min</span>
                            <span>🔥 ${w.caloriesBurned} kcal</span>
                            ${w.distanceKm ? `<span>📍 ${w.distanceKm} km</span>` : ''}
                        </div>
                        ${w.notes ? `<p class="workout-notes">"${w.notes}"</p>` : ''}
                    </div>
                </div>
                <div class="workout-card-right">
                    <button class="btn-icon-danger btn-delete-workout" data-id="${w.id}" title="Delete workout">
                        🗑
                    </button>
                </div>
            </div>
        `).join('');

        // Bind delete listeners
        container.querySelectorAll('.btn-delete-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                Store.deleteWorkout(id);
                Utils.showToast('Workout deleted', 'info');
                this.render();
                if (window.Dashboard) window.Dashboard.render();
            });
        });
    }
};

window.Workouts = Workouts;
