/**
 * Fitness Tracker - Authentication & Session Controller
 */

const Auth = {
    init() {
        this.bindEvents();
        this.checkSession();
    },

    bindEvents() {
        // Toggle Login / Register forms
        const tabLogin = document.getElementById('auth-tab-login');
        const tabRegister = document.getElementById('auth-tab-register');
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');

        if (tabLogin && tabRegister) {
            tabLogin.addEventListener('click', () => {
                tabLogin.classList.add('active');
                tabRegister.classList.remove('active');
                formLogin.classList.remove('hidden');
                formRegister.classList.add('hidden');
            });

            tabRegister.addEventListener('click', () => {
                tabRegister.classList.add('active');
                tabLogin.classList.remove('active');
                formRegister.classList.remove('hidden');
                formLogin.classList.add('hidden');
            });
        }

        // Login Submit
        if (formLogin) {
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register Submit
        if (formRegister) {
            formRegister.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Demo Account One-Click
        const demoBtn = document.getElementById('btn-demo-login');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                this.handleDemoLogin();
            });
        }

        // Logout
        const logoutBtns = document.querySelectorAll('.btn-logout');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleLogout();
            });
        });
    },

    checkSession() {
        const user = Store.getCurrentUser();
        if (user) {
            this.showAppView(user);
        } else {
            this.showAuthView();
        }
    },

    handleLogin() {
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value;

        if (!email || !pass) {
            Utils.showToast('Please enter both email and password', 'warning');
            return;
        }

        const users = Store.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email && u.password === pass);

        if (!user) {
            Utils.showToast('Invalid email or password. Or try the 1-Click Demo account!', 'error');
            return;
        }

        Store.setCurrentUserId(user.id);
        Utils.playAudioFeedback('success');
        Utils.showToast(`Welcome back, ${user.name}!`, 'success');
        this.showAppView(user);
    },

    handleRegister() {
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const pass = document.getElementById('reg-password').value;
        const age = Number(document.getElementById('reg-age').value) || 25;
        const gender = document.getElementById('reg-gender').value || 'male';
        const weight = Number(document.getElementById('reg-weight').value) || 70;
        const height = Number(document.getElementById('reg-height').value) || 175;
        const goalType = document.getElementById('reg-goal').value || 'fat_loss';

        if (!name || !email || !pass) {
            Utils.showToast('Please fill in all required fields', 'warning');
            return;
        }

        const users = Store.getUsers();
        if (users.some(u => u.email.toLowerCase() === email)) {
            Utils.showToast('An account with this email already exists', 'error');
            return;
        }

        // Calculate custom calorie goal based on BMR
        const bmr = Utils.calculateBMR(weight, height, age, gender);
        let calorieTarget = bmr + 400; // default moderate activity
        if (goalType === 'fat_loss') calorieTarget -= 400;
        if (goalType === 'muscle_gain') calorieTarget += 350;

        const newUser = {
            id: Utils.uuid(),
            name,
            email,
            password: pass,
            age,
            gender,
            weight,
            height,
            goalType,
            targetWeight: goalType === 'fat_loss' ? weight - 4 : (goalType === 'muscle_gain' ? weight + 3 : weight),
            dailyGoals: {
                steps: 10000,
                calories: Math.round(calorieTarget),
                exerciseMins: 45,
                waterMl: 2500,
                sleepHours: 8.0
            }
        };

        Store.saveUser(newUser);
        Store.setCurrentUserId(newUser.id);
        Utils.playAudioFeedback('success');
        Utils.showToast(`Account created! Welcome, ${newUser.name}!`, 'success');
        this.showAppView(newUser);
    },

    handleDemoLogin() {
        const demoUser = Store.createDemoAccount();
        Store.setCurrentUserId(demoUser.id);
        Utils.playAudioFeedback('success');
        Utils.showToast('✨ Demo loaded with 14 days of realistic activity!', 'success');
        this.showAppView(demoUser);
    },

    handleLogout() {
        Store.setCurrentUserId(null);
        Utils.showToast('Logged out successfully.', 'info');
        this.showAuthView();
    },

    showAuthView() {
        const authSection = document.getElementById('auth-section');
        const appSection = document.getElementById('app-section');
        if (authSection) authSection.classList.remove('hidden');
        if (appSection) appSection.classList.add('hidden');
    },

    showAppView(user) {
        const authSection = document.getElementById('auth-section');
        const appSection = document.getElementById('app-section');
        if (authSection) authSection.classList.add('hidden');
        if (appSection) appSection.classList.remove('hidden');

        // Update User Name and Avatar in Header & Profile
        const nameDoms = document.querySelectorAll('.user-display-name');
        nameDoms.forEach(el => el.textContent = user.name);

        const avatarDoms = document.querySelectorAll('.user-avatar-initials');
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        avatarDoms.forEach(el => el.textContent = initials || 'FT');

        // Trigger App Refresh
        if (window.App && typeof window.App.refreshAll === 'function') {
            window.App.refreshAll();
        }
    }
};

window.Auth = Auth;
