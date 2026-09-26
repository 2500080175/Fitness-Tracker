/**
 * Fitness Tracker - Data Store & LocalStorage Manager
 */

const Store = {
    KEYS: {
        USERS: 'ft_users',
        CURRENT_USER_ID: 'ft_current_user_id',
        WORKOUTS: 'ft_workouts',
        MEALS: 'ft_meals',
        DAILY_DATA: 'ft_daily_data',
        WEARABLE: 'ft_wearable'
    },

    init() {
        // Ensure default structures exist
        if (!localStorage.getItem(this.KEYS.USERS)) {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.WORKOUTS)) {
            localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.MEALS)) {
            localStorage.setItem(this.KEYS.MEALS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.DAILY_DATA)) {
            localStorage.setItem(this.KEYS.DAILY_DATA, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.KEYS.WEARABLE)) {
            localStorage.setItem(this.KEYS.WEARABLE, JSON.stringify({
                connected: false,
                deviceName: 'FitPulse Watch Ultra',
                model: 'FP-900X',
                battery: 88,
                lastSync: null,
                isSyncing: false
            }));
        }
    },

    // --- USER MANAGEMENT ---
    getUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.USERS)) || [];
        } catch (e) {
            return [];
        }
    },

    saveUser(userData) {
        const users = this.getUsers();
        const existingIdx = users.findIndex(u => u.id === userData.id || u.email.toLowerCase() === userData.email.toLowerCase());
        if (existingIdx >= 0) {
            users[existingIdx] = { ...users[existingIdx], ...userData };
        } else {
            users.push(userData);
        }
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
        return userData;
    },

    getCurrentUserId() {
        return localStorage.getItem(this.KEYS.CURRENT_USER_ID);
    },

    setCurrentUserId(id) {
        if (id) {
            localStorage.setItem(this.KEYS.CURRENT_USER_ID, id);
        } else {
            localStorage.removeItem(this.KEYS.CURRENT_USER_ID);
        }
    },

    getCurrentUser() {
        const uid = this.getCurrentUserId();
        if (!uid) return null;
        const users = this.getUsers();
        return users.find(u => u.id === uid) || null;
    },

    // --- WORKOUTS ---
    getWorkouts(userId = null) {
        try {
            const uid = userId || this.getCurrentUserId();
            const all = JSON.parse(localStorage.getItem(this.KEYS.WORKOUTS)) || [];
            return uid ? all.filter(w => w.userId === uid) : all;
        } catch (e) {
            return [];
        }
    },

    addWorkout(workout) {
        const all = JSON.parse(localStorage.getItem(this.KEYS.WORKOUTS)) || [];
        const newWorkout = {
            id: Utils.uuid(),
            userId: this.getCurrentUserId(),
            date: workout.date || Utils.getTodayStr(),
            time: workout.time || Utils.formatTime(),
            type: workout.type || 'Workout',
            category: workout.category || 'Cardio',
            durationMinutes: Number(workout.durationMinutes) || 30,
            caloriesBurned: Number(workout.caloriesBurned) || 200,
            intensity: workout.intensity || 'Medium',
            distanceKm: workout.distanceKm ? Number(workout.distanceKm) : null,
            notes: workout.notes || ''
        };
        all.unshift(newWorkout);
        localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(all));

        // Update day's active minutes & burned calories
        this.recalculateDailyTelemetry(newWorkout.date);
        return newWorkout;
    },

    deleteWorkout(id) {
        let all = JSON.parse(localStorage.getItem(this.KEYS.WORKOUTS)) || [];
        const target = all.find(w => w.id === id);
        all = all.filter(w => w.id !== id);
        localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(all));
        if (target) {
            this.recalculateDailyTelemetry(target.date);
        }
    },

    // --- MEALS & NUTRITION ---
    getMeals(userId = null) {
        try {
            const uid = userId || this.getCurrentUserId();
            const all = JSON.parse(localStorage.getItem(this.KEYS.MEALS)) || [];
            return uid ? all.filter(m => m.userId === uid) : all;
        } catch (e) {
            return [];
        }
    },

    addMeal(meal) {
        const all = JSON.parse(localStorage.getItem(this.KEYS.MEALS)) || [];
        const newMeal = {
            id: Utils.uuid(),
            userId: this.getCurrentUserId(),
            date: meal.date || Utils.getTodayStr(),
            time: meal.time || Utils.formatTime(),
            mealType: meal.mealType || 'Lunch',
            name: meal.name || 'Custom Meal',
            calories: Number(meal.calories) || 0,
            protein: Number(meal.protein) || 0,
            carbs: Number(meal.carbs) || 0,
            fat: Number(meal.fat) || 0
        };
        all.unshift(newMeal);
        localStorage.setItem(this.KEYS.MEALS, JSON.stringify(all));
        this.recalculateDailyTelemetry(newMeal.date);
        return newMeal;
    },

    deleteMeal(id) {
        let all = JSON.parse(localStorage.getItem(this.KEYS.MEALS)) || [];
        const target = all.find(m => m.id === id);
        all = all.filter(m => m.id !== id);
        localStorage.setItem(this.KEYS.MEALS, JSON.stringify(all));
        if (target) {
            this.recalculateDailyTelemetry(target.date);
        }
    },

    // --- DAILY TELEMETRY / DATA ---
    getAllDailyData() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.DAILY_DATA)) || {};
        } catch (e) {
            return {};
        }
    },

    getDayData(date = Utils.getTodayStr()) {
        const all = this.getAllDailyData();
        const uid = this.getCurrentUserId();
        const userKey = `${uid}_${date}`;
        
        if (!all[userKey]) {
            // Default blank day telemetry
            return {
                date,
                userId: uid,
                steps: 4200,
                waterMl: 1250,
                sleepHours: 7.4,
                sleepScore: 86,
                sleepStages: { deep: 22, rem: 24, light: 46, awake: 8 },
                restingHeartRate: 64,
                avgHeartRate: 72,
                maxHeartRate: 148,
                standHours: 9
            };
        }
        return all[userKey];
    },

    saveDayData(date, data) {
        const all = this.getAllDailyData();
        const uid = this.getCurrentUserId();
        const userKey = `${uid}_${date}`;
        all[userKey] = { ...(all[userKey] || {}), ...data, date, userId: uid };
        localStorage.setItem(this.KEYS.DAILY_DATA, JSON.stringify(all));
        return all[userKey];
    },

    addWater(amountMl, date = Utils.getTodayStr()) {
        const day = this.getDayData(date);
        day.waterMl = Math.max(0, (day.waterMl || 0) + amountMl);
        this.saveDayData(date, day);
        return day.waterMl;
    },

    addSteps(stepsCount, date = Utils.getTodayStr()) {
        const day = this.getDayData(date);
        day.steps = Math.max(0, (day.steps || 0) + stepsCount);
        this.saveDayData(date, day);
        return day.steps;
    },

    recalculateDailyTelemetry(date) {
        // Hook to trigger recalculations or notifications when meals/workouts change
        const event = new CustomEvent('ft_data_updated', { detail: { date } });
        window.dispatchEvent(event);
    },

    // --- WEARABLE STATE ---
    getWearable() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.WEARABLE)) || {};
        } catch (e) {
            return { connected: false };
        }
    },

    saveWearable(data) {
        const current = this.getWearable();
        const updated = { ...current, ...data };
        localStorage.setItem(this.KEYS.WEARABLE, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('ft_wearable_updated', { detail: updated }));
        return updated;
    },

    // --- DEMO ACCOUNT SEEDER ---
    createDemoAccount() {
        const demoUserId = 'user_demo_101';
        const demoUser = {
            id: demoUserId,
            name: 'Alex Mercer',
            email: 'demo@fitpulse.io',
            password: 'demo',
            age: 28,
            gender: 'male',
            weight: 74.5,
            height: 178,
            goalType: 'fat_loss',
            targetWeight: 70.0,
            dailyGoals: {
                steps: 10000,
                calories: 2200,
                exerciseMins: 45,
                waterMl: 2800,
                sleepHours: 8.0
            }
        };
        this.saveUser(demoUser);

        // Seed 14 days of realistic logs
        const workouts = [];
        const meals = [];
        const dailyData = {};

        const workoutCatalog = [
            { type: 'Morning Trail Run', category: 'Cardio', duration: 42, calories: 420, intensity: 'High', dist: 6.2 },
            { type: 'Upper Body Hypertrophy', category: 'Strength', duration: 55, calories: 330, intensity: 'High' },
            { type: 'HIIT Conditioning', category: 'HIIT', duration: 30, calories: 310, intensity: 'High' },
            { type: 'Vinyasa Flow Yoga', category: 'Flexibility', duration: 45, calories: 180, intensity: 'Low' },
            { type: 'Outdoor Cycling', category: 'Cycling', duration: 60, calories: 480, intensity: 'Medium', dist: 18.5 },
            { type: 'Legs & Core Blast', category: 'Strength', duration: 50, calories: 360, intensity: 'High' },
            { type: 'Evening Recovery Walk', category: 'Walking', duration: 35, calories: 150, intensity: 'Low', dist: 3.1 }
        ];

        const mealCatalog = [
            { type: 'Breakfast', name: 'Oatmeal with Blueberries, Whey & Chia Seeds', calories: 480, protein: 36, carbs: 62, fat: 10 },
            { type: 'Lunch', name: 'Grilled Chicken Quinoa Bowl with Avocado', calories: 650, protein: 52, carbs: 58, fat: 22 },
            { type: 'Snack', name: 'Greek Yogurt with Almonds & Honey', calories: 240, protein: 20, carbs: 18, fat: 9 },
            { type: 'Dinner', name: 'Baked Salmon with Sweet Potato & Asparagus', calories: 620, protein: 46, carbs: 45, fat: 26 },
            { type: 'Breakfast', name: 'Avocado Toast with 3 Poached Eggs', calories: 510, protein: 24, carbs: 36, fat: 28 },
            { type: 'Lunch', name: 'Steak Burrito Bowl with Black Beans', calories: 710, protein: 50, carbs: 70, fat: 24 },
            { type: 'Dinner', name: 'Tofu & Vegetable Stir-Fry with Brown Rice', calories: 540, protein: 32, carbs: 65, fat: 16 }
        ];

        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dayNum}`;

            // Workouts on most days
            if (i % 7 !== 0) { // 6 days a week
                const wo = workoutCatalog[i % workoutCatalog.length];
                workouts.push({
                    id: Utils.uuid(),
                    userId: demoUserId,
                    date: dateStr,
                    time: '07:30 AM',
                    type: wo.type,
                    category: wo.category,
                    durationMinutes: wo.duration,
                    caloriesBurned: wo.calories + Math.floor(Math.random() * 40 - 20),
                    intensity: wo.intensity,
                    distanceKm: wo.dist || null,
                    notes: 'Felt great energy throughout the session.'
                });
            }

            // Meals
            const m1 = mealCatalog[(i * 2) % mealCatalog.length];
            const m2 = mealCatalog[(i * 2 + 1) % mealCatalog.length];
            const m3 = mealCatalog[(i * 2 + 2) % mealCatalog.length];
            const m4 = mealCatalog[(i * 2 + 3) % mealCatalog.length];

            meals.push({
                id: Utils.uuid(),
                userId: demoUserId,
                date: dateStr,
                time: '08:30 AM',
                mealType: 'Breakfast',
                name: m1.name,
                calories: m1.calories,
                protein: m1.protein,
                carbs: m1.carbs,
                fat: m1.fat
            });
            meals.push({
                id: Utils.uuid(),
                userId: demoUserId,
                date: dateStr,
                time: '01:15 PM',
                mealType: 'Lunch',
                name: m2.name,
                calories: m2.calories,
                protein: m2.protein,
                carbs: m2.carbs,
                fat: m2.fat
            });
            meals.push({
                id: Utils.uuid(),
                userId: demoUserId,
                date: dateStr,
                time: '04:30 PM',
                mealType: 'Snack',
                name: m3.name,
                calories: m3.calories,
                protein: m3.protein,
                carbs: m3.carbs,
                fat: m3.fat
            });
            meals.push({
                id: Utils.uuid(),
                userId: demoUserId,
                date: dateStr,
                time: '08:00 PM',
                mealType: 'Dinner',
                name: m4.name,
                calories: m4.calories,
                protein: m4.protein,
                carbs: m4.carbs,
                fat: m4.fat
            });

            // Daily Telemetry
            const stepVariance = Math.floor(Math.sin(i) * 1800);
            const steps = i === 0 ? 8420 : 10200 + stepVariance;
            const water = i === 0 ? 2100 : 2600 + Math.floor(Math.sin(i * 2) * 400);
            const sleep = 7.2 + Math.round((Math.cos(i) * 0.8) * 10) / 10;
            const deepPct = 20 + Math.floor(Math.random() * 6);
            const remPct = 22 + Math.floor(Math.random() * 5);
            const awakePct = 6 + Math.floor(Math.random() * 4);
            const lightPct = 100 - (deepPct + remPct + awakePct);

            dailyData[`${demoUserId}_${dateStr}`] = {
                date: dateStr,
                userId: demoUserId,
                steps,
                waterMl: water,
                sleepHours: Number(sleep.toFixed(1)),
                sleepScore: Math.min(96, Math.max(68, Math.round(75 + (sleep - 6) * 10))),
                sleepStages: {
                    deep: deepPct,
                    rem: remPct,
                    light: lightPct,
                    awake: awakePct
                },
                restingHeartRate: 62 + Math.floor(Math.random() * 4),
                avgHeartRate: 72 + Math.floor(Math.random() * 6),
                maxHeartRate: 154 + Math.floor(Math.random() * 12),
                standHours: 10 + (i % 4)
            };
        }

        // Store seeded arrays
        localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(workouts));
        localStorage.setItem(this.KEYS.MEALS, JSON.stringify(meals));
        localStorage.setItem(this.KEYS.DAILY_DATA, JSON.stringify(dailyData));
        this.saveWearable({
            connected: true,
            deviceName: 'FitPulse Watch Ultra',
            model: 'FP-900X',
            battery: 88,
            lastSync: new Date().toLocaleTimeString(),
            isSyncing: false
        });

        return demoUser;
    }
};

Store.init();
window.Store = Store;
