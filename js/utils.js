/**
 * Fitness Tracker - Utility Functions & UI Helpers
 */

const Utils = {
    // Generate unique ID
    uuid() {
        return 'ft_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    },

    // Format Date: e.g. "Today, Sep 22" or "Monday, Sep 21"
    formatDate(dateStr) {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
            return `Today, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    },

    // Format ISO Date YYYY-MM-DD
    getTodayStr() {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    // Format time HH:MM AM/PM
    formatTime(date = new Date()) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    },

    // Format numbers with commas (e.g. 10,450)
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('en-US');
    },

    // Calculate BMR (Basal Metabolic Rate using Mifflin-St Jeor)
    calculateBMR(weightKg, heightCm, age, gender = 'male') {
        let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        return gender === 'female' ? Math.round(bmr - 161) : Math.round(bmr + 5);
    },

    // Toast Notification System
    showToast(message, type = 'info', duration = 3200) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠',
            heart: '♥',
            fire: '🔥'
        };

        const toast = document.createElement('div');
        toast.className = `toast-card toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '✨'}</span>
            <div class="toast-content">${message}</div>
            <button class="toast-close">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-hiding');
            setTimeout(() => toast.remove(), 250);
        });

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('toast-hiding');
                setTimeout(() => toast.remove(), 250);
            }
        }, duration);
    },

    // Web Audio Subtle Synth Beep for Heartbeat / Workout Finish
    playAudioFeedback(kind = 'beep') {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (kind === 'heartbeat') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(120, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                osc.start();
                osc.stop(ctx.currentTime + 0.13);
            } else if (kind === 'success') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            // Audio context might be restricted before user gesture, safely ignore
        }
    }
};

window.Utils = Utils;
