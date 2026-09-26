/**
 * Fitness Tracker - Nutrition, Calorie & Water Tracker Controller
 */

const Diet = {
    // Quick food presets for fast 1-click logging
    PRESETS: [
        { name: 'Oatmeal with Berries & Whey', type: 'Breakfast', cal: 450, p: 32, c: 60, f: 9 },
        { name: 'Avocado Toast & 2 Eggs', type: 'Breakfast', cal: 420, p: 18, c: 32, f: 24 },
        { name: 'Grilled Chicken Rice Bowl', type: 'Lunch', cal: 620, p: 50, c: 65, f: 16 },
        { name: 'Tuna & Sweet Potato Salad', type: 'Lunch', cal: 530, p: 44, c: 54, f: 14 },
        { name: 'Baked Salmon & Asparagus', type: 'Dinner', cal: 580, p: 45, c: 22, f: 34 },
        { name: 'Steak & Roasted Veggies', type: 'Dinner', cal: 680, p: 54, c: 28, f: 38 },
        { name: 'Greek Yogurt & Almonds', type: 'Snack', cal: 220, p: 20, c: 14, f: 10 },
        { name: 'Whey Protein Shake', type: 'Snack', cal: 180, p: 30, c: 6, f: 3 }
    ],

    init() {
        this.bindEvents();
        this.renderPresetPills();
    },

    bindEvents() {
        // Form Log Meal Submit
        const form = document.getElementById('form-log-meal');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveMeal();
            });
        }

        // Water buttons in Nutrition tab
        const addWater250 = document.getElementById('diet-water-add-250');
        const addWater500 = document.getElementById('diet-water-add-500');
        const subWater250 = document.getElementById('diet-water-sub-250');

        if (addWater250) {
            addWater250.addEventListener('click', () => {
                Store.addWater(250);
                Utils.playAudioFeedback('beep');
                this.render();
                if (window.Dashboard) window.Dashboard.render();
            });
        }
        if (addWater500) {
            addWater500.addEventListener('click', () => {
                Store.addWater(500);
                Utils.playAudioFeedback('beep');
                this.render();
                if (window.Dashboard) window.Dashboard.render();
            });
        }
        if (subWater250) {
            subWater250.addEventListener('click', () => {
                Store.addWater(-250);
                this.render();
                if (window.Dashboard) window.Dashboard.render();
            });
        }
    },

    renderPresetPills() {
        const container = document.getElementById('meal-presets-container');
        if (!container) return;

        container.innerHTML = this.PRESETS.map(p => `
            <button type="button" class="preset-pill" data-name="${p.name}">
                <span>${p.name}</span>
                <span class="preset-cal">${p.cal} kcal</span>
            </button>
        `).join('');

        container.querySelectorAll('.preset-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const preset = this.PRESETS.find(p => p.name === pill.dataset.name);
                if (preset) {
                    document.getElementById('meal-name').value = preset.name;
                    document.getElementById('meal-type').value = preset.type;
                    document.getElementById('meal-calories').value = preset.cal;
                    document.getElementById('meal-protein').value = preset.p;
                    document.getElementById('meal-carbs').value = preset.c;
                    document.getElementById('meal-fat').value = preset.f;
                    Utils.showToast(`Selected "${preset.name}" preset`, 'info');
                }
            });
        });
    },

    handleSaveMeal() {
        const name = document.getElementById('meal-name').value.trim();
        const mealType = document.getElementById('meal-type').value;
        const calories = Number(document.getElementById('meal-calories').value);
        const protein = Number(document.getElementById('meal-protein').value) || 0;
        const carbs = Number(document.getElementById('meal-carbs').value) || 0;
        const fat = Number(document.getElementById('meal-fat').value) || 0;
        const date = document.getElementById('meal-date').value || Utils.getTodayStr();

        if (!name || isNaN(calories) || calories < 0) {
            Utils.showToast('Please enter a valid meal name and calorie count', 'warning');
            return;
        }

        Store.addMeal({
            name,
            mealType,
            calories,
            protein,
            carbs,
            fat,
            date
        });

        Utils.playAudioFeedback('success');
        Utils.showToast(`Logged ${name} (${calories} kcal)! 🥗`, 'success');

        // Close modal
        if (window.App) window.App.closeModal('modal-log-meal');

        // Reset form
        document.getElementById('form-log-meal').reset();
        document.getElementById('meal-date').value = Utils.getTodayStr();

        this.render();
        if (window.Dashboard) window.Dashboard.render();
    },

    render() {
        const user = Store.getCurrentUser();
        if (!user) return;

        const todayStr = Utils.getTodayStr();
        const meals = Store.getMeals().filter(m => m.date === todayStr);
        const workouts = Store.getWorkouts().filter(w => w.date === todayStr);
        const dayData = Store.getDayData(todayStr);

        const calorieTarget = user.dailyGoals?.calories || 2200;
        const waterTarget = user.dailyGoals?.waterMl || 2500;

        // Macro targets (typical balanced 30% P / 45% C / 25% F)
        const targetProteinG = Math.round((calorieTarget * 0.30) / 4);
        const targetCarbsG = Math.round((calorieTarget * 0.45) / 4);
        const targetFatG = Math.round((calorieTarget * 0.25) / 9);

        // Sums
        const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
        const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
        const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);
        const totalBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

        const remainingCals = Math.max(0, calorieTarget - totalCalories);

        // Update Calorie Display
        const calConsumedEl = document.getElementById('diet-cal-consumed');
        const calRemainingEl = document.getElementById('diet-cal-remaining');
        const calTargetEl = document.getElementById('diet-cal-target');
        const calBurnedEl = document.getElementById('diet-cal-burned');
        const calProgressBar = document.getElementById('diet-cal-progressbar');

        if (calConsumedEl) calConsumedEl.textContent = Utils.formatNumber(totalCalories);
        if (calRemainingEl) calRemainingEl.textContent = Utils.formatNumber(remainingCals);
        if (calTargetEl) calTargetEl.textContent = `${Utils.formatNumber(calorieTarget)} kcal`;
        if (calBurnedEl) calBurnedEl.textContent = `+${Utils.formatNumber(totalBurned)} burned`;

        if (calProgressBar) {
            const pct = Math.min(100, Math.round((totalCalories / calorieTarget) * 100));
            calProgressBar.style.width = `${pct}%`;
            if (pct > 100) {
                calProgressBar.style.background = 'var(--accent-coral)';
            } else {
                calProgressBar.style.background = 'var(--gradient-lime)';
            }
        }

        // Update Macro Bars
        this.updateMacroBar('protein', totalProtein, targetProteinG);
        this.updateMacroBar('carbs', totalCarbs, targetCarbsG);
        this.updateMacroBar('fat', totalFat, targetFatG);

        // Update Water Bottle Level
        const currentWater = dayData.waterMl || 0;
        const waterPct = Math.min(100, Math.round((currentWater / waterTarget) * 100));
        const waterFill = document.getElementById('water-fluid-level');
        const waterText = document.getElementById('diet-water-text');
        const waterPctText = document.getElementById('diet-water-pct');

        if (waterFill) waterFill.style.height = `${waterPct}%`;
        if (waterText) waterText.textContent = `${(currentWater / 1000).toFixed(1)} / ${(waterTarget / 1000).toFixed(1)} L`;
        if (waterPctText) waterPctText.textContent = `${waterPct}%`;

        // Render Meals Grouped by Type
        this.renderMealGroups(meals);
    },

    updateMacroBar(macro, current, target) {
        const valEl = document.getElementById(`macro-${macro}-val`);
        const targetEl = document.getElementById(`macro-${macro}-target`);
        const barEl = document.getElementById(`macro-${macro}-bar`);

        if (valEl) valEl.textContent = `${Math.round(current)}g`;
        if (targetEl) targetEl.textContent = `/ ${target}g`;
        if (barEl) {
            const pct = Math.min(100, Math.round((current / target) * 100));
            barEl.style.width = `${pct}%`;
        }
    },

    renderMealGroups(meals) {
        const container = document.getElementById('meals-list-container');
        if (!container) return;

        const types = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
        let html = '';

        types.forEach(t => {
            const filtered = meals.filter(m => m.mealType.toLowerCase() === t.toLowerCase());
            const typeCalories = filtered.reduce((s, m) => s + m.calories, 0);

            html += `
                <div class="meal-group">
                    <div class="meal-group-header">
                        <div class="meal-group-title">
                            <span class="meal-type-icon">${t === 'Breakfast' ? '🍳' : (t === 'Lunch' ? '🥗' : (t === 'Dinner' ? '🍲' : '🍎'))}</span>
                            <h4>${t}</h4>
                        </div>
                        <span class="meal-group-cals">${typeCalories} kcal</span>
                    </div>
                    <div class="meal-group-items">
                        ${filtered.length === 0 
                            ? `<div class="meal-item-empty">No ${t.toLowerCase()} logged yet.</div>`
                            : filtered.map(m => `
                                <div class="meal-item">
                                    <div class="meal-item-info">
                                        <span class="meal-item-name">${m.name}</span>
                                        <span class="meal-item-macros">P: ${m.protein}g • C: ${m.carbs}g • F: ${m.fat}g</span>
                                    </div>
                                    <div class="meal-item-right">
                                        <span class="meal-item-cals">${m.calories} kcal</span>
                                        <button class="btn-icon-danger btn-delete-meal" data-id="${m.id}" title="Remove meal">✕</button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Bind delete listeners
        container.querySelectorAll('.btn-delete-meal').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                Store.deleteMeal(id);
                Utils.showToast('Meal removed', 'info');
                this.render();
                if (window.Dashboard) window.Dashboard.render();
            });
        });
    }
};

window.Diet = Diet;
