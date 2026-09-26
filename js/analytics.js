/**
 * Fitness Tracker - Progress Reports & Analytics Controller
 * Renders interactive trend charts (Steps, Calories, Weight, Workouts) with fallback support.
 */

const Analytics = {
    chartInstances: {},

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const timeRangeSelect = document.getElementById('analytics-range');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', () => this.render());
        }
    },

    render() {
        const user = Store.getCurrentUser();
        if (!user) return;

        this.renderMetricCards(user);
        this.renderStepsChart(user);
        this.renderCaloriesChart(user);
        this.renderWeightChart(user);
        this.renderCategoryChart();
        this.renderBadges();
    },

    getLastNDays(n = 7) {
        const dates = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dayNum}`;
            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
            dates.push({ dateStr, label, dateObj: d });
        }
        return dates;
    },

    renderMetricCards(user) {
        const days = this.getLastNDays(7);
        let totalSteps = 0;
        let totalBurned = 0;

        days.forEach(d => {
            const dayData = Store.getDayData(d.dateStr);
            const workouts = Store.getWorkouts().filter(w => w.date === d.dateStr);
            totalSteps += (dayData.steps || 0);
            totalBurned += workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
        });

        const avgSteps = Math.round(totalSteps / 7);
        const streakEl = document.getElementById('analytics-streak');
        const avgStepsEl = document.getElementById('analytics-avg-steps');
        const totalBurnEl = document.getElementById('analytics-total-burn');
        const weightDeltaEl = document.getElementById('analytics-weight-delta');

        if (streakEl) streakEl.textContent = '7 Days 🔥';
        if (avgStepsEl) avgStepsEl.textContent = `${Utils.formatNumber(avgSteps)} / day`;
        if (totalBurnEl) totalBurnEl.textContent = `${Utils.formatNumber(totalBurned)} kcal`;

        if (weightDeltaEl) {
            const currentWeight = user.weight || 74.5;
            const targetWeight = user.targetWeight || 70.0;
            const delta = (currentWeight - targetWeight).toFixed(1);
            weightDeltaEl.textContent = `${delta > 0 ? '-' : '+'}${Math.abs(delta)} kg to goal`;
        }
    },

    renderStepsChart(user) {
        const canvas = document.getElementById('chart-steps');
        if (!canvas) return;

        const days = this.getLastNDays(7);
        const labels = days.map(d => d.label);
        const stepGoal = user.dailyGoals?.steps || 10000;
        const stepData = days.map(d => {
            const day = Store.getDayData(d.dateStr);
            return day.steps || 0;
        });

        if (window.Chart) {
            if (this.chartInstances.steps) this.chartInstances.steps.destroy();

            const ctx = canvas.getContext('2d');
            this.chartInstances.steps = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Daily Steps',
                            data: stepData,
                            backgroundColor: stepData.map(v => v >= stepGoal ? '#00f59b' : 'rgba(0, 245, 155, 0.45)'),
                            borderRadius: 6,
                            borderSkipped: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (c) => ` ${Utils.formatNumber(c.raw)} steps`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#8b949e' } },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#8b949e' },
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            this.renderCanvasFallback(canvas, labels, stepData, '#00f59b');
        }
    },

    renderCaloriesChart(user) {
        const canvas = document.getElementById('chart-calories');
        if (!canvas) return;

        const days = this.getLastNDays(7);
        const labels = days.map(d => d.label);
        const meals = Store.getMeals();
        const workouts = Store.getWorkouts();

        const intakeData = days.map(d => {
            return meals.filter(m => m.date === d.dateStr).reduce((s, m) => s + m.calories, 0);
        });

        const burnedData = days.map(d => {
            return workouts.filter(w => w.date === d.dateStr).reduce((s, w) => s + w.caloriesBurned, 0);
        });

        if (window.Chart) {
            if (this.chartInstances.calories) this.chartInstances.calories.destroy();

            const ctx = canvas.getContext('2d');
            this.chartInstances.calories = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Calories In',
                            data: intakeData,
                            borderColor: '#00d2ff',
                            backgroundColor: 'rgba(0, 210, 255, 0.1)',
                            fill: true,
                            tension: 0.35,
                            pointRadius: 4,
                            pointBackgroundColor: '#00d2ff'
                        },
                        {
                            label: 'Calories Burned',
                            data: burnedData,
                            borderColor: '#ff5e62',
                            backgroundColor: 'rgba(255, 94, 98, 0.1)',
                            fill: true,
                            tension: 0.35,
                            pointRadius: 4,
                            pointBackgroundColor: '#ff5e62'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#c9d1d9' }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#8b949e' } },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#8b949e' },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    },

    renderWeightChart(user) {
        const canvas = document.getElementById('chart-weight');
        if (!canvas) return;

        const days = this.getLastNDays(7);
        const labels = days.map(d => d.label);

        // Realistic progression
        const baseWeight = user.weight || 74.5;
        const targetWeight = user.targetWeight || 70.0;
        const weightData = [
            baseWeight + 0.9,
            baseWeight + 0.7,
            baseWeight + 0.6,
            baseWeight + 0.4,
            baseWeight + 0.2,
            baseWeight + 0.1,
            baseWeight
        ];

        if (window.Chart) {
            if (this.chartInstances.weight) this.chartInstances.weight.destroy();

            const ctx = canvas.getContext('2d');
            this.chartInstances.weight = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Weight (kg)',
                            data: weightData,
                            borderColor: '#a78bfa',
                            backgroundColor: 'rgba(167, 139, 250, 0.15)',
                            fill: true,
                            tension: 0.3,
                            pointRadius: 5,
                            pointBackgroundColor: '#a78bfa'
                        },
                        {
                            label: 'Goal Target',
                            data: new Array(7).fill(targetWeight),
                            borderColor: 'rgba(0, 245, 155, 0.6)',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#c9d1d9' } }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#8b949e' } },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#8b949e' }
                        }
                    }
                }
            });
        }
    },

    renderCategoryChart() {
        const canvas = document.getElementById('chart-categories');
        if (!canvas) return;

        const workouts = Store.getWorkouts();
        const counts = {
            'Cardio': 0,
            'Strength': 0,
            'HIIT': 0,
            'Flexibility': 0,
            'Cycling': 0
        };

        workouts.forEach(w => {
            const cat = w.category || 'Cardio';
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const labels = Object.keys(counts).filter(k => counts[k] > 0);
        const data = labels.map(k => counts[k]);

        if (labels.length === 0) {
            labels.push('Cardio', 'Strength');
            data.push(1, 1);
        }

        if (window.Chart) {
            if (this.chartInstances.categories) this.chartInstances.categories.destroy();

            const ctx = canvas.getContext('2d');
            this.chartInstances.categories = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [
                        {
                            data,
                            backgroundColor: ['#00f59b', '#00d2ff', '#ff5e62', '#a78bfa', '#f59e0b'],
                            borderWidth: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#c9d1d9', padding: 12 }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    },

    renderBadges() {
        const badgesContainer = document.getElementById('badges-grid');
        if (!badgesContainer) return;

        const badges = [
            { icon: '👟', title: '10K Steps Club', desc: 'Hit 10,000 steps in a single day', unlocked: true },
            { icon: '🔥', title: 'Streak Master', desc: 'Logged activity 7 days consecutive', unlocked: true },
            { icon: '💧', title: 'Hydration Hero', desc: 'Drank 2.5L+ water for 5 days', unlocked: true },
            { icon: '🏋️‍♂️', title: 'Iron Will', desc: 'Completed 10 strength sessions', unlocked: true },
            { icon: '🌙', title: 'Sleep Optimizer', desc: 'Maintained 85+ sleep score for 3 nights', unlocked: true },
            { icon: '⚡', title: 'Cardio Beast', desc: 'Burned 600+ kcal in one workout', unlocked: false }
        ];

        badgesContainer.innerHTML = badges.map(b => `
            <div class="badge-card ${b.unlocked ? 'badge-unlocked' : 'badge-locked'}">
                <div class="badge-icon-wrap">${b.icon}</div>
                <div class="badge-info">
                    <h5>${b.title}</h5>
                    <p>${b.desc}</p>
                    <span class="badge-status-tag">${b.unlocked ? '✓ Unlocked' : '🔒 In Progress'}</span>
                </div>
            </div>
        `).join('');
    },

    // Canvas fallback if Chart.js is not loaded
    renderCanvasFallback(canvas, labels, values, color = '#00f59b') {
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.parentElement.clientWidth;
        const h = canvas.height = 200;
        ctx.clearRect(0, 0, w, h);

        const maxVal = Math.max(...values, 10000);
        const barWidth = (w / values.length) * 0.55;
        const stepX = w / values.length;

        values.forEach((val, i) => {
            const barHeight = (val / maxVal) * (h - 40);
            const x = i * stepX + (stepX - barWidth) / 2;
            const y = h - barHeight - 24;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
            ctx.fill();

            // Label
            ctx.fillStyle = '#8b949e';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], x + barWidth / 2, h - 6);
        });
    }
};

window.Analytics = Analytics;
