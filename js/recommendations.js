/**
 * Fitness Tracker - Personalized Health & Fitness Recommendations Engine
 * Generates tailored, dynamic advice based on sleep, hydration, calorie delta, and activity.
 */

const Recommendations = {
    generateRecommendations() {
        const user = Store.getCurrentUser();
        if (!user) return [];

        const todayStr = Utils.getTodayStr();
        const dayData = Store.getDayData(todayStr);
        const workouts = Store.getWorkouts().filter(w => w.date === todayStr);
        const meals = Store.getMeals().filter(m => m.date === todayStr);

        const calorieTarget = user.dailyGoals?.calories || 2200;
        const waterTarget = user.dailyGoals?.waterMl || 2500;
        const stepGoal = user.dailyGoals?.steps || 10000;

        const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
        const totalBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
        const currentWater = dayData.waterMl || 0;
        const currentSteps = dayData.steps || 0;
        const sleepHours = dayData.sleepHours || 7.5;
        const sleepScore = dayData.sleepScore || 85;

        const insights = [];

        // 1. Sleep & CNS Readiness
        if (sleepHours < 6.5) {
            insights.push({
                category: 'Recovery',
                priority: 'high',
                icon: '😴',
                title: 'Prioritize Active Recovery Today',
                body: `You logged ${sleepHours} hours of sleep last night (below your ${user.dailyGoals.sleepHours}h goal). Lower workout intensity to reduce central nervous system fatigue.`,
                actionText: 'Log Gentle Yoga / Walk',
                type: 'warning'
            });
        } else if (sleepScore >= 85) {
            insights.push({
                category: 'Performance',
                priority: 'normal',
                icon: '⚡',
                title: 'High Neuromuscular Readiness',
                body: `Great restorative sleep recorded (${sleepScore}/100 with ${dayData.sleepStages?.deep || 24}% deep sleep). Your body is primed for a high-intensity session or PR attempt today!`,
                actionText: 'Start Workout',
                type: 'success'
            });
        }

        // 2. Hydration & Active Sweat Rate
        if (totalBurned > 350 && currentWater < waterTarget * 0.6) {
            insights.push({
                category: 'Hydration',
                priority: 'high',
                icon: '💧',
                title: 'Replenish Fluid Deficit',
                body: `You burned ${totalBurned} kcal across your workout today, but hydration is currently at ${(currentWater / 1000).toFixed(1)}L. Drink 500ml-750ml electrolyte-rich water to optimize muscle recovery.`,
                actionText: '+500ml Water',
                actionFn: () => {
                    Store.addWater(500);
                    Dashboard.render();
                    Recommendations.renderBanner();
                },
                type: 'info'
            });
        }

        // 3. Nutrition & Goal Alignment
        if (user.goalType === 'fat_loss') {
            const netCal = totalCalories - totalBurned;
            if (totalCalories > 0 && totalCalories < 1200) {
                insights.push({
                    category: 'Nutrition',
                    priority: 'medium',
                    icon: '🥗',
                    title: 'Calorie Intake Too Low',
                    body: `Total intake is only ${totalCalories} kcal. Prolonged extreme deficits slow your thyroid and metabolic rate. Fuel up with wholesome lean protein and greens.`,
                    actionText: 'Log Balanced Snack',
                    type: 'warning'
                });
            } else if (totalProtein < 80 && meals.length >= 2) {
                insights.push({
                    category: 'Nutrition',
                    priority: 'medium',
                    icon: '🥩',
                    title: 'Boost Protein for Muscle Retention',
                    body: `You have consumed ${Math.round(totalProtein)}g protein today. For fat loss with lean muscle preservation, aim for at least 1.6g - 2.0g per kg of bodyweight.`,
                    actionText: 'Add Protein',
                    type: 'info'
                });
            }
        }

        // 4. Daily Steps & NEAT
        if (currentSteps < stepGoal * 0.7) {
            const remaining = stepGoal - currentSteps;
            insights.push({
                category: 'Movement',
                priority: 'normal',
                icon: '👟',
                title: `${Utils.formatNumber(remaining)} Steps to Daily Target`,
                body: `A brisk 20-minute post-meal stroll will boost digestion, insulin sensitivity, and help you reach your ${Utils.formatNumber(stepGoal)} step goal easily.`,
                actionText: 'Take a Walk',
                type: 'info'
            });
        } else {
            insights.push({
                category: 'Movement',
                priority: 'low',
                icon: '🎯',
                title: 'Daily Movement Target Achieved',
                body: `Outstanding effort! You reached ${Utils.formatNumber(currentSteps)} steps today, maintaining active non-exercise activity thermogenesis (NEAT).`,
                actionText: 'Keep it Up',
                type: 'success'
            });
        }

        return insights;
    },

    renderBanner() {
        const bannerContainer = document.getElementById('recommendation-banner');
        if (!bannerContainer) return;

        const insights = this.generateRecommendations();
        if (insights.length === 0) {
            bannerContainer.classList.add('hidden');
            return;
        }

        bannerContainer.classList.remove('hidden');
        // Pick highest priority insight for banner
        const primary = insights[0];

        bannerContainer.className = `recommendation-banner banner-${primary.type}`;
        bannerContainer.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">${primary.icon}</span>
                <div class="banner-text">
                    <div class="banner-header">
                        <span class="badge badge-recom">${primary.category} Insight</span>
                        <h4>${primary.title}</h4>
                    </div>
                    <p>${primary.body}</p>
                </div>
            </div>
            <div class="banner-right">
                <button class="btn btn-sm btn-recom-action" id="btn-recom-primary">${primary.actionText}</button>
            </div>
        `;

        const actionBtn = document.getElementById('btn-recom-primary');
        if (actionBtn && primary.actionFn) {
            actionBtn.addEventListener('click', primary.actionFn);
        } else if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                Utils.showToast('Follow the daily guidance to maximize your health!', 'info');
            });
        }

        // Also render full list in the Recommendations tab if present
        this.renderFullList(insights);
    },

    renderFullList(insights) {
        const listContainer = document.getElementById('all-recommendations-list');
        if (!listContainer) return;

        listContainer.innerHTML = insights.map(item => `
            <div class="recom-card recom-${item.type}">
                <div class="recom-card-icon">${item.icon}</div>
                <div class="recom-card-body">
                    <div class="recom-card-header">
                        <span class="badge badge-subtle">${item.category}</span>
                        <h4>${item.title}</h4>
                    </div>
                    <p>${item.body}</p>
                </div>
            </div>
        `).join('');
    }
};

window.Recommendations = Recommendations;
