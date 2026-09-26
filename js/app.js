/**
 * Fitness Tracker - Main Application Orchestrator & View Switcher
 */

const App = {
    currentTab: 'dashboard',

    init() {
        // Initialize sub-modules
        Auth.init();
        Dashboard.init();
        Workouts.init();
        Diet.init();
        Wearable.init();
        Analytics.init();

        this.bindNavigation();
        this.bindModals();
        this.bindGlobalEvents();
        this.initDatePickers();
        this.bindGoalsEditor();

        // If user already logged in, refresh views
        if (Store.getCurrentUser()) {
            this.refreshAll();
        }
    },

    bindNavigation() {
        const navBtns = document.querySelectorAll('[data-tab]');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = btn.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    },

    switchTab(tabId) {
        this.currentTab = tabId;

        // Update active class on nav buttons (desktop and mobile)
        const navBtns = document.querySelectorAll('[data-tab]');
        navBtns.forEach(b => {
            if (b.dataset.tab === tabId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // Hide all views, show target view
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => {
            if (v.id === `view-${tabId}`) {
                v.classList.remove('hidden');
            } else {
                v.classList.add('hidden');
            }
        });

        // Render specific view logic
        if (tabId === 'dashboard') {
            Dashboard.render();
        } else if (tabId === 'workouts') {
            Workouts.render();
        } else if (tabId === 'diet') {
            Diet.render();
        } else if (tabId === 'wearable') {
            Wearable.render();
        } else if (tabId === 'analytics') {
            Analytics.render();
        } else if (tabId === 'goals') {
            this.renderGoalsView();
        }

        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    bindModals() {
        // Open modal triggers
        document.querySelectorAll('[data-modal-open]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modalOpen;
                this.openModal(modalId);
            });
        });

        // Close modal triggers
        document.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Close on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
            }
        });
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            // If opening workout modal, recalculate calorie estimate
            if (modalId === 'modal-log-workout' && window.Workouts) {
                Workouts.updateEstimatedCalories();
            }
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    initDatePickers() {
        const todayStr = Utils.getTodayStr();
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = todayStr;
            }
        });
    },

    bindGlobalEvents() {
        window.addEventListener('ft_data_updated', () => {
            this.refreshAll();
        });

        window.addEventListener('ft_wearable_updated', () => {
            Dashboard.render();
        });
    },

    bindGoalsEditor() {
        const goalsForm = document.getElementById('form-edit-goals');
        if (goalsForm) {
            goalsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const user = Store.getCurrentUser();
                if (!user) return;

                const stepGoal = Number(document.getElementById('goal-steps').value) || 10000;
                const calGoal = Number(document.getElementById('goal-calories').value) || 2200;
                const exGoal = Number(document.getElementById('goal-exercise').value) || 45;
                const waterGoal = Number(document.getElementById('goal-water').value) || 2500;
                const sleepGoal = Number(document.getElementById('goal-sleep').value) || 8.0;
                const targetWeight = Number(document.getElementById('goal-weight').value) || user.weight;

                user.dailyGoals = {
                    steps: stepGoal,
                    calories: calGoal,
                    exerciseMins: exGoal,
                    waterMl: waterGoal,
                    sleepHours: sleepGoal
                };
                user.targetWeight = targetWeight;

                Store.saveUser(user);
                Utils.playAudioFeedback('success');
                Utils.showToast('Fitness Goals updated successfully! 🎯', 'success');

                this.closeModal('modal-edit-goals');
                this.refreshAll();
            });
        }

        // Open edit goals modal trigger
        const btnOpenGoals = document.getElementById('btn-open-edit-goals');
        if (btnOpenGoals) {
            btnOpenGoals.addEventListener('click', () => {
                const user = Store.getCurrentUser();
                if (!user) return;

                document.getElementById('goal-steps').value = user.dailyGoals?.steps || 10000;
                document.getElementById('goal-calories').value = user.dailyGoals?.calories || 2200;
                document.getElementById('goal-exercise').value = user.dailyGoals?.exerciseMins || 45;
                document.getElementById('goal-water').value = user.dailyGoals?.waterMl || 2500;
                document.getElementById('goal-sleep').value = user.dailyGoals?.sleepHours || 8.0;
                document.getElementById('goal-weight').value = user.targetWeight || user.weight;

                this.openModal('modal-edit-goals');
            });
        }
    },

    renderGoalsView() {
        const user = Store.getCurrentUser();
        if (!user) return;

        const goals = user.dailyGoals || { steps: 10000, calories: 2200, exerciseMins: 45, waterMl: 2500, sleepHours: 8.0 };
        const dayData = Store.getDayData();
        const workouts = Store.getWorkouts().filter(w => w.date === Utils.getTodayStr());
        const meals = Store.getMeals().filter(m => m.date === Utils.getTodayStr());

        const totalEx = workouts.reduce((s, w) => s + (w.durationMinutes || 0), 0);
        const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
        const currentWater = dayData.waterMl || 0;

        // Render Goal Progress Cards in the Goals view
        this.renderGoalCard('steps', dayData.steps || 0, goals.steps, 'steps', '👟');
        this.renderGoalCard('calories', totalCal, goals.calories, 'kcal', '🥗');
        this.renderGoalCard('exercise', totalEx, goals.exerciseMins, 'min', '⏱');
        this.renderGoalCard('water', currentWater, goals.waterMl, 'ml', '💧');
        this.renderGoalCard('sleep', Math.round((dayData.sleepHours || 7.5) * 10) / 10, goals.sleepHours, 'hrs', '🌙');
        this.renderGoalCard('weight', user.weight, user.targetWeight, 'kg target', '⚖️');
    },

    renderGoalCard(id, current, target, unit, icon) {
        const card = document.getElementById(`goal-card-${id}`);
        if (!card) return;

        const pct = Math.min(100, Math.round((current / target) * 100));
        const valEl = card.querySelector('.goal-card-val');
        const targetEl = card.querySelector('.goal-card-target');
        const barEl = card.querySelector('.goal-card-bar');
        const pctEl = card.querySelector('.goal-card-pct');

        if (valEl) valEl.textContent = `${Utils.formatNumber(current)} ${unit}`;
        if (targetEl) targetEl.textContent = `Target: ${Utils.formatNumber(target)} ${unit}`;
        if (barEl) barEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
    },

    refreshAll() {
        Dashboard.render();
        Workouts.render();
        Diet.render();
        Wearable.render();
        Analytics.render();
        this.renderGoalsView();
    }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
