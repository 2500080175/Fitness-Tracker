/**
 * Fitness Tracker - Dashboard & Activity Rings Controller
 */

const Dashboard = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Quick water add buttons directly from dashboard
        const quickWater250 = document.getElementById('btn-quick-water-250');
        const quickWater500 = document.getElementById('btn-quick-water-500');

        if (quickWater250) {
            quickWater250.addEventListener('click', () => {
                Store.addWater(250);
                Utils.playAudioFeedback('beep');
                Utils.showToast('+250ml Hydration logged! 💧', 'info');
                this.render();
            });
        }

        if (quickWater500) {
            quickWater500.addEventListener('click', () => {
                Store.addWater(500);
                Utils.playAudioFeedback('beep');
                Utils.showToast('+500ml Hydration logged! 💧', 'info');
                this.render();
            });
        }

        // Quick add step simulation button
        const quickStep1k = document.getElementById('btn-quick-step-1k');
        if (quickStep1k) {
            quickStep1k.addEventListener('click', () => {
                Store.addSteps(1000);
                Utils.playAudioFeedback('beep');
                Utils.showToast('+1,000 Steps synced! 👟', 'success');
                this.render();
            });
        }
    },

    render() {
        const user = Store.getCurrentUser();
        if (!user) return;

        const todayStr = Utils.getTodayStr();
        const dayData = Store.getDayData(todayStr);
        const workouts = Store.getWorkouts().filter(w => w.date === todayStr);
        const meals = Store.getMeals().filter(m => m.date === todayStr);

        // Daily Goals
        const stepGoal = user.dailyGoals?.steps || 10000;
        const calorieGoal = user.dailyGoals?.calories || 2200;
        const exerciseGoal = user.dailyGoals?.exerciseMins || 45;
        const waterGoal = user.dailyGoals?.waterMl || 2500;

        // Calculate Today's Totals
        const totalExerciseMins = workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
        const totalCaloriesBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
        const totalCaloriesConsumed = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
        const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
        const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

        // --- Render Activity Rings ---
        this.renderActivityRings({
            move: { current: totalCaloriesBurned, goal: 500 }, // active burn
            exercise: { current: totalExerciseMins, goal: exerciseGoal },
            stand: { current: dayData.standHours || 10, goal: 12 }
        });

        // --- Metric 1: Steps ---
        const stepsEl = document.getElementById('dash-steps-val');
        const stepsGoalEl = document.getElementById('dash-steps-goal');
        const stepsBar = document.getElementById('dash-steps-bar');
        const stepsDistEl = document.getElementById('dash-steps-distance');

        if (stepsEl) stepsEl.textContent = Utils.formatNumber(dayData.steps);
        if (stepsGoalEl) stepsGoalEl.textContent = `/ ${Utils.formatNumber(stepGoal)} steps`;
        if (stepsBar) {
            const stepPct = Math.min(100, Math.round((dayData.steps / stepGoal) * 100));
            stepsBar.style.width = `${stepPct}%`;
        }
        if (stepsDistEl) {
            // Approx 0.762 meters per step => km = steps * 0.000762
            const km = (dayData.steps * 0.000762).toFixed(2);
            stepsDistEl.textContent = `${km} km walked`;
        }

        // --- Metric 2: Calories In vs Burned ---
        const calInEl = document.getElementById('dash-cal-consumed');
        const calBurnEl = document.getElementById('dash-cal-burned');
        const calNetEl = document.getElementById('dash-cal-net');
        const calBudgetBar = document.getElementById('dash-cal-bar');

        if (calInEl) calInEl.textContent = Utils.formatNumber(totalCaloriesConsumed);
        if (calBurnEl) calBurnEl.textContent = Utils.formatNumber(totalCaloriesBurned);
        if (calNetEl) {
            const net = totalCaloriesConsumed - totalCaloriesBurned;
            calNetEl.textContent = `${net > 0 ? '+' : ''}${Utils.formatNumber(net)} kcal`;
            calNetEl.className = net > 0 ? 'metric-sub text-warning' : 'metric-sub text-success';
        }
        if (calBudgetBar) {
            const calPct = Math.min(100, Math.round((totalCaloriesConsumed / calorieGoal) * 100));
            calBudgetBar.style.width = `${calPct}%`;
        }

        // --- Metric 3: Water Hydration ---
        const waterEl = document.getElementById('dash-water-val');
        const waterGoalEl = document.getElementById('dash-water-goal');
        const waterBar = document.getElementById('dash-water-bar');
        const waterPctEl = document.getElementById('dash-water-pct');

        const currentWater = dayData.waterMl || 0;
        const waterPct = Math.min(100, Math.round((currentWater / waterGoal) * 100));
        if (waterEl) waterEl.textContent = `${(currentWater / 1000).toFixed(1)} L`;
        if (waterGoalEl) waterGoalEl.textContent = `/ ${(waterGoal / 1000).toFixed(1)} L Goal`;
        if (waterBar) waterBar.style.width = `${waterPct}%`;
        if (waterPctEl) waterPctEl.textContent = `${waterPct}%`;

        // --- Metric 4: Wearable Live Vitals ---
        const bpmEl = document.getElementById('dash-bpm-val');
        const sleepEl = document.getElementById('dash-sleep-val');
        const sleepScoreEl = document.getElementById('dash-sleep-score');
        const wearable = Store.getWearable();

        if (bpmEl) {
            bpmEl.textContent = wearable.connected ? (dayData.avgHeartRate || 72) : '--';
        }
        if (sleepEl) {
            const hrs = Math.floor(dayData.sleepHours || 7.5);
            const mins = Math.round(((dayData.sleepHours || 7.5) - hrs) * 60);
            sleepEl.textContent = `${hrs}h ${mins}m`;
        }
        if (sleepScoreEl) {
            sleepScoreEl.textContent = `Score: ${dayData.sleepScore || 85}/100`;
        }

        // --- Render Today's Activity Timeline ---
        this.renderTimeline(workouts, meals);

        // --- Trigger Smart Recommendations Banner ---
        if (window.Recommendations) {
            window.Recommendations.renderBanner();
        }
    },

    renderActivityRings(rings) {
        // Circumferences for circles with r = 58, 44, 30
        const moveCircumference = 2 * Math.PI * 58;      // ~364.42
        const exerciseCircumference = 2 * Math.PI * 44;  // ~276.46
        const standCircumference = 2 * Math.PI * 30;     // ~188.50

        const movePct = Math.min(1.5, rings.move.current / rings.move.goal);
        const exercisePct = Math.min(1.5, rings.exercise.current / rings.exercise.goal);
        const standPct = Math.min(1.5, rings.stand.current / rings.stand.goal);

        const ringMove = document.getElementById('ring-move');
        const ringExercise = document.getElementById('ring-exercise');
        const ringStand = document.getElementById('ring-stand');

        if (ringMove) {
            const offset = moveCircumference - (movePct * moveCircumference);
            ringMove.style.strokeDashoffset = offset;
        }
        if (ringExercise) {
            const offset = exerciseCircumference - (exercisePct * exerciseCircumference);
            ringExercise.style.strokeDashoffset = offset;
        }
        if (ringStand) {
            const offset = standCircumference - (standPct * standCircumference);
            ringStand.style.strokeDashoffset = offset;
        }

        // Ring stat labels
        const moveValEl = document.getElementById('ring-move-val');
        const exerciseValEl = document.getElementById('ring-exercise-val');
        const standValEl = document.getElementById('ring-stand-val');

        if (moveValEl) moveValEl.textContent = `${Math.round(rings.move.current)} / ${rings.move.goal} kcal`;
        if (exerciseValEl) exerciseValEl.textContent = `${Math.round(rings.exercise.current)} / ${rings.exercise.goal} min`;
        if (standValEl) standValEl.textContent = `${rings.stand.current} / ${rings.stand.goal} hrs`;
    },

    renderTimeline(workouts, meals) {
        const listEl = document.getElementById('today-feed-list');
        if (!listEl) return;

        // Combine workouts and meals into unified list
        const items = [];
        workouts.forEach(w => {
            items.push({
                type: 'workout',
                time: w.time || '10:00 AM',
                title: w.type,
                subtitle: `${w.durationMinutes} min • 🔥 ${w.caloriesBurned} kcal ${w.distanceKm ? `• ${w.distanceKm} km` : ''}`,
                badge: w.category || 'Workout',
                badgeClass: 'badge-workout',
                icon: '⚡'
            });
        });

        meals.forEach(m => {
            items.push({
                type: 'meal',
                time: m.time || '12:30 PM',
                title: m.name,
                subtitle: `${m.mealType} • ${m.calories} kcal (P: ${m.protein}g, C: ${m.carbs}g, F: ${m.fat}g)`,
                badge: m.mealType,
                badgeClass: 'badge-meal',
                icon: '🥗'
            });
        });

        if (items.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎯</div>
                    <p>No activity logged yet today.</p>
                    <span class="empty-hint">Use the quick log buttons above to record your workout or meals!</span>
                </div>
            `;
            return;
        }

        listEl.innerHTML = items.map(item => `
            <div class="timeline-item">
                <div class="timeline-icon ${item.type === 'workout' ? 'icon-workout' : 'icon-meal'}">
                    ${item.icon}
                </div>
                <div class="timeline-details">
                    <div class="timeline-header">
                        <span class="timeline-title">${item.title}</span>
                        <span class="timeline-time">${item.time}</span>
                    </div>
                    <div class="timeline-meta">
                        <span>${item.subtitle}</span>
                        <span class="badge ${item.badgeClass}">${item.badge}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

window.Dashboard = Dashboard;
