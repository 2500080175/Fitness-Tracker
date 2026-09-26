/**
 * Fitness Tracker - Wearable Device Simulator & Live Health Hub
 * Simulates real-time heart rate ECG, live BPM pulse, sleep stages, and telemetry sync.
 */

const Wearable = {
    bpmInterval: null,
    ecgInterval: null,
    currentBpm: 72,
    ecgCanvas: null,
    ecgCtx: null,
    ecgPoints: [],

    init() {
        this.bindEvents();
        this.initEcgCanvas();
        this.startBpmSimulation();
    },

    bindEvents() {
        // Toggle Connect/Disconnect button
        const toggleBtn = document.getElementById('btn-wearable-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleConnection());
        }

        // Sync Now button
        const syncBtn = document.getElementById('btn-wearable-sync');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncTelemetry());
        }

        // Quick Sync button from header or dashboard
        const quickSyncBtn = document.getElementById('btn-quick-sync-wearable');
        if (quickSyncBtn) {
            quickSyncBtn.addEventListener('click', () => this.syncTelemetry());
        }
    },

    toggleConnection() {
        const state = Store.getWearable();
        const newConnected = !state.connected;
        Store.saveWearable({ connected: newConnected });

        if (newConnected) {
            Utils.playAudioFeedback('success');
            Utils.showToast('FitPulse Watch connected via Bluetooth 5.3! ⚡', 'success');
            this.startBpmSimulation();
        } else {
            Utils.showToast('Wearable disconnected.', 'info');
            this.stopBpmSimulation();
        }

        this.render();
        if (window.Dashboard) window.Dashboard.render();
    },

    syncTelemetry() {
        const state = Store.getWearable();
        if (!state.connected) {
            Utils.showToast('Wearable is disconnected. Please connect device first.', 'warning');
            return;
        }

        const syncBtn = document.getElementById('btn-wearable-sync');
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<span class="spinner-inline"></span> Syncing...';
        }

        // Simulate Bluetooth packet transmission delay
        setTimeout(() => {
            const todayStr = Utils.getTodayStr();
            const day = Store.getDayData(todayStr);

            // Add simulated steps & update heart rate
            const newSteps = Math.floor(Math.random() * 650) + 300;
            day.steps = (day.steps || 0) + newSteps;
            day.avgHeartRate = this.currentBpm;
            Store.saveDayData(todayStr, day);

            Store.saveWearable({
                lastSync: Utils.formatTime(),
                battery: Math.max(12, (state.battery || 88) - 1)
            });

            Utils.playAudioFeedback('success');
            Utils.showToast(`Synced +${newSteps} steps & latest vitals from FitPulse Watch! ⌚`, 'success');

            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = '⚡ Sync Now';
            }

            this.render();
            if (window.Dashboard) window.Dashboard.render();
            if (window.Analytics) window.Analytics.render();
        }, 900);
    },

    startBpmSimulation() {
        if (this.bpmInterval) clearInterval(this.bpmInterval);

        // Fluctuate heart rate slightly every 2.5s for realism
        this.bpmInterval = setInterval(() => {
            const state = Store.getWearable();
            if (!state.connected) return;

            const delta = (Math.random() * 6 - 3); // -3 to +3 bpm
            this.currentBpm = Math.min(130, Math.max(58, Math.round(this.currentBpm + delta)));

            // Update live BPM text
            const bpmDisplay = document.getElementById('live-bpm-val');
            const bpmPulseRing = document.getElementById('live-heart-icon');
            if (bpmDisplay) bpmDisplay.textContent = this.currentBpm;

            // Adjust pulse animation speed based on BPM
            if (bpmPulseRing) {
                const animDuration = (60 / this.currentBpm).toFixed(2);
                bpmPulseRing.style.animationDuration = `${animDuration}s`;
            }

            // Update zone text
            const zoneEl = document.getElementById('live-hr-zone');
            if (zoneEl) {
                if (this.currentBpm < 65) zoneEl.textContent = 'Resting Zone';
                else if (this.currentBpm < 115) zoneEl.textContent = 'Fat Burn Zone';
                else if (this.currentBpm < 145) zoneEl.textContent = 'Cardio Zone';
                else zoneEl.textContent = 'Peak Performance Zone';
            }
        }, 2500);

        // Start ECG line drawing
        this.startEcgAnimation();
    },

    stopBpmSimulation() {
        if (this.bpmInterval) clearInterval(this.bpmInterval);
        if (this.ecgInterval) cancelAnimationFrame(this.ecgInterval);

        const bpmDisplay = document.getElementById('live-bpm-val');
        if (bpmDisplay) bpmDisplay.textContent = '--';
    },

    initEcgCanvas() {
        this.ecgCanvas = document.getElementById('ecg-canvas');
        if (!this.ecgCanvas) return;
        this.ecgCtx = this.ecgCanvas.getContext('2d');
        this.ecgPoints = new Array(100).fill(this.ecgCanvas.height / 2);
    },

    startEcgAnimation() {
        if (!this.ecgCanvas || !this.ecgCtx) this.initEcgCanvas();
        if (!this.ecgCanvas) return;

        let tick = 0;
        const draw = () => {
            const state = Store.getWearable();
            if (!state.connected) return;

            const w = this.ecgCanvas.width;
            const h = this.ecgCanvas.height;
            const mid = h / 2;

            tick++;
            // Generate ECG waveform pattern every ~45 ticks
            let nextY = mid;
            const beatPhase = tick % 45;
            if (beatPhase === 15) nextY = mid - 8;   // P wave
            else if (beatPhase === 18) nextY = mid + 6; // Q wave
            else if (beatPhase === 20) nextY = mid - 28; // R peak!
            else if (beatPhase === 22) nextY = mid + 16; // S wave
            else if (beatPhase === 28) nextY = mid - 10; // T wave

            this.ecgPoints.push(nextY);
            if (this.ecgPoints.length > 80) {
                this.ecgPoints.shift();
            }

            // Draw on canvas
            this.ecgCtx.clearRect(0, 0, w, h);

            // Draw grid line
            this.ecgCtx.strokeStyle = 'rgba(255, 94, 98, 0.15)';
            this.ecgCtx.lineWidth = 1;
            this.ecgCtx.beginPath();
            this.ecgCtx.moveTo(0, mid);
            this.ecgCtx.lineTo(w, mid);
            this.ecgCtx.stroke();

            // Draw ECG trace
            this.ecgCtx.strokeStyle = '#ff5e62';
            this.ecgCtx.lineWidth = 2.5;
            this.ecgCtx.lineJoin = 'round';
            this.ecgCtx.shadowColor = '#ff5e62';
            this.ecgCtx.shadowBlur = 8;
            this.ecgCtx.beginPath();

            const stepX = w / (this.ecgPoints.length - 1);
            for (let i = 0; i < this.ecgPoints.length; i++) {
                const x = i * stepX;
                const y = this.ecgPoints[i];
                if (i === 0) this.ecgCtx.moveTo(x, y);
                else this.ecgCtx.lineTo(x, y);
            }
            this.ecgCtx.stroke();
            this.ecgCtx.shadowBlur = 0; // reset shadow

            this.ecgInterval = requestAnimationFrame(draw);
        };

        if (this.ecgInterval) cancelAnimationFrame(this.ecgInterval);
        this.ecgInterval = requestAnimationFrame(draw);
    },

    render() {
        const state = Store.getWearable();
        const todayStr = Utils.getTodayStr();
        const dayData = Store.getDayData(todayStr);

        // Device Connection UI
        const statusBadge = document.getElementById('wearable-status-badge');
        const toggleBtn = document.getElementById('btn-wearable-toggle');
        const deviceNameEl = document.getElementById('wearable-device-name');
        const batteryEl = document.getElementById('wearable-battery-val');
        const batteryFill = document.getElementById('wearable-battery-fill');
        const lastSyncEl = document.getElementById('wearable-last-sync');

        if (statusBadge) {
            statusBadge.className = `badge ${state.connected ? 'badge-connected' : 'badge-disconnected'}`;
            statusBadge.textContent = state.connected ? '● Connected' : '○ Disconnected';
        }

        if (toggleBtn) {
            toggleBtn.className = state.connected ? 'btn btn-outline-danger' : 'btn btn-primary';
            toggleBtn.textContent = state.connected ? 'Disconnect Device' : 'Connect Device';
        }

        if (deviceNameEl) deviceNameEl.textContent = state.deviceName || 'FitPulse Watch Ultra';
        if (batteryEl) batteryEl.textContent = `${state.battery || 88}%`;
        if (batteryFill) batteryFill.style.width = `${state.battery || 88}%`;
        if (lastSyncEl) lastSyncEl.textContent = state.lastSync ? `Last synced: ${state.lastSync}` : 'Not synced yet today';

        // Sleep stages rendering
        const sleepHoursEl = document.getElementById('sleep-total-hours');
        const sleepScoreEl = document.getElementById('sleep-score-val');
        const stages = dayData.sleepStages || { deep: 24, rem: 25, light: 45, awake: 6 };

        if (sleepHoursEl) {
            const hrs = Math.floor(dayData.sleepHours || 7.5);
            const mins = Math.round(((dayData.sleepHours || 7.5) - hrs) * 60);
            sleepHoursEl.textContent = `${hrs}h ${mins}m`;
        }

        if (sleepScoreEl) {
            sleepScoreEl.textContent = `${dayData.sleepScore || 86}/100`;
        }

        // Sleep Stage Bars
        const barDeep = document.getElementById('sleep-bar-deep');
        const barRem = document.getElementById('sleep-bar-rem');
        const barLight = document.getElementById('sleep-bar-light');
        const barAwake = document.getElementById('sleep-bar-awake');

        if (barDeep) barDeep.style.width = `${stages.deep}%`;
        if (barRem) barRem.style.width = `${stages.rem}%`;
        if (barLight) barLight.style.width = `${stages.light}%`;
        if (barAwake) barAwake.style.width = `${stages.awake}%`;

        // Sleep Stage Percentages
        const pctDeep = document.getElementById('sleep-pct-deep');
        const pctRem = document.getElementById('sleep-pct-rem');
        const pctLight = document.getElementById('sleep-pct-light');
        const pctAwake = document.getElementById('sleep-pct-awake');

        if (pctDeep) pctDeep.textContent = `${stages.deep}%`;
        if (pctRem) pctRem.textContent = `${stages.rem}%`;
        if (pctLight) pctLight.textContent = `${stages.light}%`;
        if (pctAwake) pctAwake.textContent = `${stages.awake}%`;

        // Resting & Max Heart Rate cards
        const restingHrEl = document.getElementById('wearable-resting-hr');
        const maxHrEl = document.getElementById('wearable-max-hr');

        if (restingHrEl) restingHrEl.textContent = `${dayData.restingHeartRate || 64} bpm`;
        if (maxHrEl) maxHrEl.textContent = `${dayData.maxHeartRate || 154} bpm`;
    }
};

window.Wearable = Wearable;
