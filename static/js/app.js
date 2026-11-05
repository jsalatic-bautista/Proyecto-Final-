/**
 * THE TIKI TAKA — Gaming Edition Client Controller
 * Controla la máquina de estados, sonido Web Audio procedural,
 * animaciones de fondo, interactividad y comunicación con la API de Flask.
 */

(() => {
    'use strict';

    // =========================================================================
    // 1. MOTOR DE SONIDO PROCEDURAL (Web Audio API)
    // No requiere archivos de audio externos; genera sintetizadores en tiempo real.
    // =========================================================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.enabled = true;
            this.initialized = false;
        }

        init() {
            if (this.initialized) return;
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    this.initialized = true;
                }
            } catch (e) {
                console.warn('Web Audio no soportado:', e);
            }
        }

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        playTone(freq, duration, type = 'sine', gainVal = 0.15) {
            if (!this.enabled || !this.ctx) return;
            this.resume();

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (err) {
                // Silencioso ante bloqueos de audio
            }
        }

        playClick() {
            this.playTone(850, 0.06, 'triangle', 0.1);
        }

        playCorrect() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            // Acorde arpegiado ascendente cyber (Do5 - Mi5 - Sol5)
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 0.22, 'triangle', 0.18);
                }, idx * 75);
            });
        }

        playIncorrect() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            // Zumbido grave descendente
            const notes = [160, 110];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 0.25, 'sawtooth', 0.15);
                }, idx * 110);
            });
        }

        playTick() {
            this.playTone(1100, 0.04, 'sine', 0.08);
        }

        playTransition() {
            this.playTone(420, 0.12, 'sine', 0.09);
        }

        playFanfare() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            // Fanfarria triunfal futurista
            const notes = [440, 554.37, 659.25, 880];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 0.35, 'triangle', 0.22);
                }, idx * 100);
            });
        }

        // --- SONIDOS PROCEDURALES DE LA INTRO CINEMATOGRÁFICA ---
        playFloodlightClick() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                // Snap metálico
                const snap = this.ctx.createOscillator();
                const snapGain = this.ctx.createGain();
                snap.type = 'triangle';
                snap.frequency.setValueAtTime(1400, now);
                snap.frequency.exponentialRampToValueAtTime(120, now + 0.05);
                snapGain.gain.setValueAtTime(0.28, now);
                snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                snap.connect(snapGain);
                snapGain.connect(this.ctx.destination);
                snap.start(now);
                snap.stop(now + 0.05);

                // Zumbido grave de alta tensión
                const hum = this.ctx.createOscillator();
                const humGain = this.ctx.createGain();
                hum.type = 'sawtooth';
                hum.frequency.setValueAtTime(75, now);
                humGain.gain.setValueAtTime(0.18, now);
                humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                hum.connect(humGain);
                humGain.connect(this.ctx.destination);
                hum.start(now);
                hum.stop(now + 0.35);
            } catch (e) {}
        }

        startStadiumMurmur() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                if (this.murmurNode) return;
                const bufferSize = this.ctx.sampleRate * 2;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * 0.3;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                noise.loop = true;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(450, this.ctx.currentTime);
                filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 1.2);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start();
                this.murmurNode = { noise, gain };
            } catch (e) {}
        }

        stopStadiumMurmur() {
            if (this.murmurNode && this.ctx) {
                try {
                    const now = this.ctx.currentTime;
                    this.murmurNode.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
                    setTimeout(() => {
                        try { this.murmurNode?.noise.stop(); } catch(e){}
                        this.murmurNode = null;
                    }, 400);
                } catch(e) {
                    this.murmurNode = null;
                }
            }
        }

        playBicycleKickSound() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                // Golpe potente de pelota
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);
                gain.gain.setValueAtTime(0.45, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.16);

                // Latigazo del aire
                const whip = this.ctx.createOscillator();
                const whipGain = this.ctx.createGain();
                whip.type = 'triangle';
                whip.frequency.setValueAtTime(480, now);
                whip.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
                whipGain.gain.setValueAtTime(0.28, now);
                whipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                whip.connect(whipGain);
                whipGain.connect(this.ctx.destination);
                whip.start(now);
                whip.stop(now + 0.08);
            } catch (e) {}
        }

        playNetSwish() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                // Swish de red: ruido filtrado en barrido descendente
                const bufferSize = this.ctx.sampleRate * 0.35;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1);
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(2800, now);
                filter.frequency.exponentialRampToValueAtTime(320, now + 0.28);
                filter.Q.setValueAtTime(2.2, now);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.38, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);

                // Impacto seco en la soga
                const thud = this.ctx.createOscillator();
                const thudGain = this.ctx.createGain();
                thud.type = 'sine';
                thud.frequency.setValueAtTime(120, now);
                thud.frequency.exponentialRampToValueAtTime(28, now + 0.14);
                thudGain.gain.setValueAtTime(0.32, now);
                thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                thud.connect(thudGain);
                thudGain.connect(this.ctx.destination);
                thud.start(now);
                thud.stop(now + 0.14);
            } catch (e) {}
        }

        playCrowdGoalRoar() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                const dur = 3.2;
                const bufferSize = this.ctx.sampleRate * dur;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1);
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(750, now);
                filter.frequency.linearRampToValueAtTime(2400, now + 0.4);
                filter.frequency.exponentialRampToValueAtTime(450, now + dur);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.48, now + 0.28);
                gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);

                // Bocina de gol tradicional de cancha
                [220, 330, 440].forEach((freq) => {
                    const horn = this.ctx.createOscillator();
                    const hGain = this.ctx.createGain();
                    horn.type = 'sawtooth';
                    horn.frequency.setValueAtTime(freq, now + 0.1);
                    hGain.gain.setValueAtTime(0.12, now + 0.1);
                    hGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
                    horn.connect(hGain);
                    hGain.connect(this.ctx.destination);
                    horn.start(now + 0.1);
                    horn.stop(now + 1.8);
                });
            } catch (e) {}
        }

        playSubtleCrowdMurmur() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                const dur = 2.4;
                const bufferSize = this.ctx.sampleRate * dur;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1);
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(450, now);
                filter.frequency.linearRampToValueAtTime(750, now + 0.35);
                filter.frequency.exponentialRampToValueAtTime(320, now + dur);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.25);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
            } catch (e) {}
        }

        playMenuMove() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(540, now);
                osc.frequency.exponentialRampToValueAtTime(780, now + 0.045);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.045);
            } catch (e) {}
        }

        playMenuSelect() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                const o1 = this.ctx.createOscillator();
                const g1 = this.ctx.createGain();
                o1.type = 'triangle';
                o1.frequency.setValueAtTime(587.33, now);
                o1.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                g1.gain.setValueAtTime(0.18, now);
                g1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                o1.connect(g1);
                g1.connect(this.ctx.destination);
                o1.start(now);
                o1.stop(now + 0.1);

                const o2 = this.ctx.createOscillator();
                const g2 = this.ctx.createGain();
                o2.type = 'sine';
                o2.frequency.setValueAtTime(880, now + 0.05);
                o2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2);
                g2.gain.setValueAtTime(0.16, now + 0.05);
                g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                o2.connect(g2);
                g2.connect(this.ctx.destination);
                o2.start(now + 0.05);
                o2.stop(now + 0.2);
            } catch (e) {}
        }

        playPowerupEffect() {
            if (!this.enabled || !this.ctx) return;
            this.resume();
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(1280, now + 0.22);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.22);
            } catch (e) {}
        }
    }

    const sound = new SoundEngine();

    // =========================================================================
    // 1.2. MOTOR DE RELATOR REAL (Audios Neurales es-AR-TomasNeural / mis_voces)
    // Locución real de relator argentino generada con edge-tts.
    // Mezcla cada frase con murmullo sutil de tribuna sintetizado con Web Audio API.
    // Si existe el archivo en static/audio/mis_voces/, tiene prioridad para grabación propia.
    // =========================================================================
    class RealNarratorEngine {
        constructor(soundEngine) {
            this.sound = soundEngine;
            this.enabled = true;
            this.currentAudio = null;
            this.relatorBase = '/static/audio/relator/';
            this.customBase = '/static/audio/mis_voces/';

            this.aciertos = [
                'acierto_1.mp3', 'acierto_2.mp3', 'acierto_3.mp3', 'acierto_4.mp3',
                'acierto_5.mp3', 'acierto_6.mp3', 'acierto_7.mp3', 'acierto_8.mp3'
            ];

            this.errores = [
                'error_1.mp3', 'error_2.mp3', 'error_3.mp3', 'error_4.mp3',
                'error_5.mp3', 'error_6.mp3', 'error_7.mp3', 'error_8.mp3'
            ];

            this.rachas = [
                'racha_1.mp3', 'racha_2.mp3', 'racha_3.mp3'
            ];
        }

        async playPhrase(fileName, onComplete = null) {
            if (!this.enabled) {
                if (onComplete) onComplete();
                return;
            }

            if (this.currentAudio) {
                try {
                    this.currentAudio.pause();
                    this.currentAudio.currentTime = 0;
                } catch (e) {}
            }

            if (this.sound) {
                this.sound.playSubtleCrowdMurmur();
            }

            const customUrl = `${this.customBase}${fileName}`;
            const officialUrl = `${this.relatorBase}${fileName}`;

            const audio = new Audio();
            this.currentAudio = audio;

            let triedCustom = false;

            const tryPlay = (url) => {
                audio.src = url;
                audio.load();
                audio.play().then(() => {
                    if (onComplete) {
                        audio.onended = onComplete;
                    }
                }).catch(() => {
                    if (!triedCustom && url === customUrl) {
                        triedCustom = true;
                        tryPlay(officialUrl);
                    } else {
                        if (onComplete) onComplete();
                    }
                });
            };

            try {
                const head = await fetch(customUrl, { method: 'HEAD' });
                if (head.ok) {
                    tryPlay(customUrl);
                } else {
                    tryPlay(officialUrl);
                }
            } catch (e) {
                tryPlay(officialUrl);
            }
        }

        narrateIntroGol(onComplete = null) {
            this.playPhrase('intro_gol.mp3', onComplete);
        }

        narrateGoal(streak = 1, onComplete = null) {
            if (streak >= 3 && Math.random() > 0.3) {
                const f = this.rachas[Math.floor(Math.random() * this.rachas.length)];
                this.playPhrase(f, onComplete);
            } else {
                const f = this.aciertos[Math.floor(Math.random() * this.aciertos.length)];
                this.playPhrase(f, onComplete);
            }
        }

        narrateMiss(onComplete = null) {
            const f = this.errores[Math.floor(Math.random() * this.errores.length)];
            this.playPhrase(f, onComplete);
        }

        narrateTimeout(onComplete = null) {
            this.playPhrase('tiempo_agotado.mp3', onComplete);
        }

        narratePenaltyResult(isGoal, onComplete = null) {
            if (isGoal) {
                this.playPhrase('penal_gol.mp3', onComplete);
            } else {
                this.playPhrase('penal_atajado.mp3', onComplete);
            }
        }

        narrateGameFinish(onComplete = null) {
            this.playPhrase('fin_partida.mp3', onComplete);
        }

        narrateNewRecord(onComplete = null) {
            this.playPhrase('nuevo_record.mp3', onComplete);
        }

        narrateWorldChampion(onComplete = null) {
            this.playPhrase('campeon_mundo.mp3', onComplete);
        }

        narrateCustom(text, pitch = 1.1, rate = 1.1) {
            const f = this.aciertos[Math.floor(Math.random() * this.aciertos.length)];
            this.playPhrase(f);
        }
    }

    const narrator = new RealNarratorEngine(sound);
    window.narrator = narrator;

    // =========================================================================
    // 1.5. INTRO CINEMATOGRÁFICA (OBJETIVO 2)
    // Estadio nocturno, reflectores secuenciales, silueta neón con chilena en slow-motion,
    // deformación elástica de la red, explosión de gol y relator.
    // =========================================================================
    class CinematicIntro {
        constructor() {
            this.container = document.getElementById('introCinematic');
            this.splash = document.getElementById('introSplash');
            this.stage = document.getElementById('introStage');
            this.canvas = document.getElementById('introCanvas');
            this.goalBanner = document.getElementById('introGoalBanner');
            this.btnStart = document.getElementById('btnStartIntro');
            this.btnSkip = document.getElementById('btnSkipIntro');

            if (!this.container || !this.canvas) return;

            this.ctx = this.canvas.getContext('2d');
            this.animId = null;
            this.running = false;
            this.startTime = null;
            this.netImpacted = false;
            this.kickTriggered = false;
            this.goalTriggered = false;

            this.netCols = 8;
            this.netRows = 9;
            this.netNodes = [];

            this.ballTail = [];
            this.sparks = [];

            // Cargar personaje retro e imagen de pelota si existen
            this.personajeImg = new Image();
            this.personajeLoaded = false;
            this.personajeImg.onload = () => { this.personajeLoaded = true; };
            this.personajeImg.onerror = () => { this.personajeLoaded = false; };
            this.personajeImg.src = '/static/img/personaje.png';

            this.ballImg = new Image();
            this.ballLoaded = false;
            this.ballImg.onload = () => { this.ballLoaded = true; };
            this.ballImg.onerror = () => { this.ballLoaded = false; };
            this.ballImg.src = '/static/img/pelota.png';

            this.setupListeners();
            this.checkAutoSkip();
        }

        checkAutoSkip() {
            const skipSaved = localStorage.getItem('thetikitaka_skip_intro') || localStorage.getItem('quizpy_skip_intro');
            if (skipSaved === 'true') {
                this.skipImmediate();
            }
        }

        setupListeners() {
            if (this.btnStart) {
                this.btnStart.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.startIntro();
                });
            }

            if (this.splash) {
                this.splash.addEventListener('click', () => {
                    if (!this.running) this.startIntro();
                });
            }

            window.addEventListener('keydown', (e) => {
                if (this.splash && !this.splash.classList.contains('hidden') && !this.running) {
                    this.startIntro();
                } else if ((e.key === 'Escape' || e.key === ' ') && this.running) {
                    this.skipIntro();
                }
            });

            if (this.btnSkip) {
                this.btnSkip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.skipIntro();
                });
            }
        }

        resize() {
            if (!this.canvas) return;
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;

            // Dimensiones del arco en el lateral derecho
            this.goalWidth = Math.min(220, this.width * 0.22);
            this.goalHeight = Math.min(280, this.height * 0.42);
            this.goalRight = this.width - Math.max(30, this.width * 0.05);
            this.goalLeft = this.goalRight - this.goalWidth;
            this.goalBottom = this.height * 0.88;
            this.goalTop = this.goalBottom - this.goalHeight;

            // Inicializar malla de nodos elásticos de la red
            this.netNodes = [];
            for (let r = 0; r <= this.netRows; r++) {
                const row = [];
                const normY = r / this.netRows;
                const baseY = this.goalTop + normY * this.goalHeight;
                for (let c = 0; c <= this.netCols; c++) {
                    const normX = c / this.netCols;
                    const baseX = this.goalLeft + normX * this.goalWidth;
                    row.push({
                        x: baseX,
                        y: baseY,
                        origX: baseX,
                        origY: baseY,
                        vx: 0,
                        vy: 0,
                        pinned: (c === 0 || r === 0 || r === this.netRows) // fijado a postes y larguero
                    });
                }
                this.netNodes.push(row);
            }
        }

        startIntro() {
            if (this.running) return;
            this.running = true;

            sound.init();
            sound.resume();
            sound.startStadiumMurmur();

            if (this.splash) {
                this.splash.style.opacity = '0';
                setTimeout(() => {
                    this.splash.classList.add('hidden');
                    if (this.stage) this.stage.classList.remove('hidden');
                    this.resize();
                    window.addEventListener('resize', () => this.resize());

                    this.startTime = performance.now();
                    this.runTimeline();
                }, 300);
            }
        }

        runTimeline() {
            const step = (now) => {
                if (!this.running) return;
                const elapsed = (now - this.startTime) / 1000;

                // Encendido secuencial de los reflectores
                if (elapsed >= 0.35 && !this.t1) {
                    this.t1 = true;
                    document.getElementById('tower1')?.classList.add('lit');
                    sound.playFloodlightClick();
                }
                if (elapsed >= 0.65 && !this.t2) {
                    this.t2 = true;
                    document.getElementById('tower2')?.classList.add('lit');
                    sound.playFloodlightClick();
                }
                if (elapsed >= 0.95 && !this.t3) {
                    this.t3 = true;
                    document.getElementById('tower3')?.classList.add('lit');
                    sound.playFloodlightClick();
                }
                if (elapsed >= 1.25 && !this.t4) {
                    this.t4 = true;
                    document.getElementById('tower4')?.classList.add('lit');
                    sound.playFloodlightClick();
                }

                this.render(elapsed);

                // Fin de la intro y transición a menú
                if (elapsed >= 5.5) {
                    this.finishIntro();
                    return;
                }

                this.animId = requestAnimationFrame(step);
            };
            this.animId = requestAnimationFrame(step);
        }

        render(elapsed) {
            this.ctx.clearRect(0, 0, this.width, this.height);

            // 1. Cancha con perspectiva y pasto iluminado
            this.drawPitch();

            // 2. Arco y red con física de resortes
            this.updateAndDrawNet();

            // 3. Personaje retro y chilena acrobática
            const playerX = this.width * 0.38;
            const playerY = this.height * 0.76;

            if (elapsed >= 1.25 && elapsed < 3.8) {
                this.drawRetroPlayer(playerX, playerY, elapsed);
            }

            // 4. Balón con estela lumínica
            this.updateAndDrawBall(elapsed);

            // 5. Explosión de gol
            if (elapsed >= 3.05 && !this.goalTriggered) {
                this.goalTriggered = true;
                this.triggerGoalExplosion();
            }
        }

        drawPitch() {
            const ctx = this.ctx;
            const horizonY = this.height * 0.58;

            const pitchGrad = ctx.createLinearGradient(0, horizonY, 0, this.height);
            pitchGrad.addColorStop(0, 'rgba(4, 18, 12, 0.45)');
            pitchGrad.addColorStop(0.5, 'rgba(8, 38, 22, 0.75)');
            pitchGrad.addColorStop(1, 'rgba(10, 52, 28, 0.92)');
            ctx.fillStyle = pitchGrad;
            ctx.fillRect(0, horizonY, this.width, this.height - horizonY);

            // Franjas de césped
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)';
            ctx.lineWidth = 1;
            for (let y = horizonY; y < this.height; y += 22) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
                ctx.stroke();
            }

            // Línea de cal del área penal en neón
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(this.width * 0.2, this.height * 0.85);
            ctx.lineTo(this.width * 0.95, this.height * 0.85);
            ctx.stroke();

            // Punto penal
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(this.width * 0.4, this.height * 0.82, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        drawRetroPlayer(bx, by, elapsed) {
            const ctx = this.ctx;
            ctx.save();

            let px = bx;
            let py = by;
            let rot = 0;

            if (elapsed < 1.7) {
                // Entrada corriendo desde la izquierda
                const runProg = (elapsed - 1.25) / 0.45;
                px = bx - (1 - runProg) * 200;
                py = by + Math.sin(runProg * 14) * 8;
                rot = 0.12;
            } else if (elapsed < 2.5) {
                // Salto y giro de chilena en slow-motion
                const kickProg = (elapsed - 1.7) / 0.8;
                px = bx + kickProg * 45;
                py = by - Math.sin(kickProg * Math.PI) * 110;
                rot = -kickProg * 1.75; // Giro acrobático en el aire
            } else {
                // Descenso tras la chilena
                const fallProg = Math.min(1, (elapsed - 2.5) / 0.7);
                px = bx + 45 + fallProg * 25;
                py = by - 25 + fallProg * 50;
                rot = -1.75 + fallProg * 0.45;
            }

            ctx.translate(px, py);
            ctx.rotate(rot);

            if (this.personajeLoaded && this.personajeImg) {
                // Dibujar figurita retro años 70 de static/img/personaje.png
                const pw = Math.max(190, Math.min(270, this.width * 0.23));
                const ph = pw * (226 / 424);

                ctx.save();
                ctx.shadowColor = 'rgba(0, 240, 255, 0.45)';
                ctx.shadowBlur = 18;
                ctx.drawImage(this.personajeImg, -pw * 0.48, -ph * 0.52, pw, ph);
                ctx.restore();
            } else {
                // Personaje ORIGINAL en Canvas/SVG retro años 70 (camiseta cian, detalles violeta, short blanco, medias oscuras)
                ctx.save();
                ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
                ctx.shadowBlur = 12;

                // Cabellera y patillas retro años 70
                ctx.fillStyle = '#30180a';
                ctx.beginPath();
                ctx.arc(-2, -58, 15, Math.PI * 0.8, Math.PI * 2.2);
                ctx.fill();

                // Cabeza y rostro en ángulo de esfuerzo
                ctx.fillStyle = '#f0c29a';
                ctx.beginPath();
                ctx.arc(0, -54, 11, 0, Math.PI * 2);
                ctx.fill();

                // Ojos y patillas setenteras
                ctx.fillStyle = '#30180a';
                ctx.fillRect(-8, -54, 4, 8); // patilla
                ctx.fillRect(2, -56, 3, 3);  // ojo

                // Camiseta retro cian (#00f0ff) con cuello y detalles violeta (#b537f2)
                ctx.fillStyle = '#00e5ff';
                ctx.beginPath();
                ctx.moveTo(-12, -42);
                ctx.lineTo(14, -42);
                ctx.lineTo(10, -14);
                ctx.lineTo(-9, -14);
                ctx.closePath();
                ctx.fill();

                // Cuello y rayas retro violetas
                ctx.fillStyle = '#a82ce0';
                ctx.beginPath();
                ctx.moveTo(-3, -42);
                ctx.lineTo(5, -42);
                ctx.lineTo(1, -33);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#a82ce0';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(3, -42);
                ctx.lineTo(1, -14);
                ctx.stroke();

                // Brazos en balance acrobático
                ctx.strokeStyle = '#f0c29a';
                ctx.lineWidth = 5.5;
                ctx.beginPath();
                ctx.moveTo(10, -38);
                ctx.lineTo(36, -24); // brazo derecho
                ctx.moveTo(-10, -38);
                ctx.lineTo(-32, -46); // brazo izquierdo
                ctx.stroke();

                // Short blanco retro setentero (ajustado y corto)
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(-9, -14);
                ctx.lineTo(10, -14);
                ctx.lineTo(14, 2);
                ctx.lineTo(1, 4);
                ctx.lineTo(-12, 0);
                ctx.closePath();
                ctx.fill();

                // Pierna izquierda doblada
                ctx.strokeStyle = '#f0c29a';
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo(-4, 0);
                ctx.lineTo(-18, 12);
                ctx.stroke();

                // Pierna derecha extendida ejecutando la chilena
                ctx.strokeStyle = '#f0c29a';
                ctx.lineWidth = 7.5;
                ctx.beginPath();
                ctx.moveTo(8, -4);
                ctx.lineTo(32, -32);
                ctx.lineTo(60, -70);
                ctx.stroke();

                // Medias oscuras con rayas cian/violeta
                ctx.strokeStyle = '#121220';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(32, -32);
                ctx.lineTo(56, -65);
                ctx.stroke();

                // Botín retro clásico de cuero con tapones
                ctx.fillStyle = '#08080c';
                ctx.beginPath();
                ctx.moveTo(54, -68);
                ctx.lineTo(70, -78);
                ctx.lineTo(66, -84);
                ctx.lineTo(50, -72);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            ctx.restore();

            // Disparar sonido y chispas en el impacto exacto (2.45s)
            if (elapsed >= 2.45 && !this.kickTriggered) {
                this.kickTriggered = true;
                sound.playBicycleKickSound();

                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 8 + 3;
                    this.sparks.push({
                        x: px + 35,
                        y: py - 55,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: Math.random() * 3 + 1.5,
                        color: Math.random() > 0.5 ? '#00f0ff' : '#ffd000',
                        life: 1.0,
                        decay: Math.random() * 0.03 + 0.02
                    });
                }
            }
        }

        updateAndDrawBall(elapsed) {
            const ctx = this.ctx;
            let bx, by;

            if (elapsed < 1.7) {
                // Balón cayendo hacia el punto de impacto
                const p = (elapsed - 1.25) / 0.45;
                bx = this.width * 0.15 + p * (this.width * 0.28);
                by = this.height * 0.25 + Math.sin(p * Math.PI * 0.5) * (this.height * 0.35);
            } else if (elapsed < 2.45) {
                // Balón suspendido en el aire
                const p = (elapsed - 1.7) / 0.75;
                bx = this.width * 0.43 - p * 15;
                by = this.height * 0.60 + Math.sin(p * 3) * 6;
            } else if (elapsed < 2.95) {
                // Disparo de chilena volando veloz hacia el ángulo del arco
                const p = (elapsed - 2.45) / 0.5;
                const startX = this.width * 0.42;
                const startY = this.height * 0.60;
                const targetX = this.goalLeft + this.goalWidth * 0.75;
                const targetY = this.goalTop + this.goalHeight * 0.18;

                bx = startX + p * (targetX - startX);
                by = startY + p * (targetY - startY) - Math.sin(p * Math.PI) * 35;

                this.ballTail.push({
                    x: bx,
                    y: by,
                    size: 13 * (1 - p * 0.3),
                    alpha: 0.9,
                    color: p > 0.5 ? '#00f0ff' : '#ffd000'
                });
            } else {
                // Balón dentro de la red
                const p = Math.min(1, (elapsed - 2.95) / 0.6);
                bx = this.goalLeft + this.goalWidth * 0.78 + Math.sin(p * 12) * (1 - p) * 12;
                by = this.goalTop + this.goalHeight * 0.22 + p * 18;

                if (!this.netImpacted) {
                    this.netImpacted = true;
                    sound.playNetSwish();
                    this.deformNet(bx, by, 70);
                }
            }

            // Dibujar estela de luz de la pelota
            for (let i = this.ballTail.length - 1; i >= 0; i--) {
                const t = this.ballTail[i];
                t.alpha -= 0.04;
                if (t.alpha <= 0) {
                    this.ballTail.splice(i, 1);
                    continue;
                }
                ctx.fillStyle = t.color;
                ctx.globalAlpha = t.alpha * 0.7;
                ctx.shadowColor = t.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.size * t.alpha, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Dibujar chispas de impacto
            for (let i = this.sparks.length - 1; i >= 0; i--) {
                const s = this.sparks[i];
                s.x += s.vx;
                s.y += s.vy;
                s.vy += 0.2;
                s.life -= s.decay;
                if (s.life <= 0) {
                    this.sparks.splice(i, 1);
                    continue;
                }
                ctx.fillStyle = s.color;
                ctx.globalAlpha = s.life;
                ctx.shadowColor = s.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Dibujar Balón (Retro o Neón procedural)
            if (bx && by) {
                ctx.save();
                ctx.translate(bx, by);

                if (this.ballLoaded && this.ballImg) {
                    const bSize = Math.max(26, Math.min(34, this.width * 0.03));
                    ctx.shadowColor = '#00f0ff';
                    ctx.shadowBlur = 16;
                    ctx.rotate(elapsed * 9);
                    ctx.drawImage(this.ballImg, -bSize / 2, -bSize / 2, bSize, bSize);
                } else {
                    ctx.shadowColor = '#00f0ff';
                    ctx.shadowBlur = 20;

                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, 14, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#0a1028';
                    ctx.beginPath();
                    ctx.arc(0, 0, 11, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#00f0ff';
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const a = i * (Math.PI * 2 / 5);
                        const px = Math.cos(a) * 6;
                        const py = Math.sin(a) * 6;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        deformNet(impactX, impactY, force) {
            for (let r = 0; r <= this.netRows; r++) {
                for (let c = 0; c <= this.netCols; c++) {
                    const n = this.netNodes[r][c];
                    if (n.pinned) continue;
                    const dx = n.x - impactX;
                    const dy = n.y - impactY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 190) {
                        const falloff = 1 - dist / 190;
                        n.vx += force * falloff * 0.85;
                        n.vy += (Math.random() - 0.5) * 16 * falloff;
                    }
                }
            }
        }

        updateAndDrawNet() {
            const ctx = this.ctx;
            if (!this.netNodes || !this.netNodes.length) return;

            const tension = 0.08;
            const damping = 0.82;

            for (let r = 0; r <= this.netRows; r++) {
                for (let c = 0; c <= this.netCols; c++) {
                    const n = this.netNodes[r][c];
                    if (!n.pinned) {
                        const ax = (n.origX - n.x) * tension;
                        const ay = (n.origY - n.y) * tension;
                        n.vx = (n.vx + ax) * damping;
                        n.vy = (n.vy + ay) * damping;
                        n.x += n.vx;
                        n.y += n.vy;
                    }
                }
            }

            // Dibujar cordajes de la red
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
            ctx.lineWidth = 1.3;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 4;

            for (let r = 0; r <= this.netRows; r++) {
                ctx.beginPath();
                for (let c = 0; c <= this.netCols; c++) {
                    const n = this.netNodes[r][c];
                    if (c === 0) ctx.moveTo(n.x, n.y);
                    else ctx.lineTo(n.x, n.y);
                }
                ctx.stroke();
            }

            for (let c = 0; c <= this.netCols; c++) {
                ctx.beginPath();
                for (let r = 0; r <= this.netRows; r++) {
                    const n = this.netNodes[r][c];
                    if (r === 0) ctx.moveTo(n.x, n.y);
                    else ctx.lineTo(n.x, n.y);
                }
                ctx.stroke();
            }

            // Postes y travesaño del arco
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5.5;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 18;

            ctx.beginPath();
            ctx.moveTo(this.goalLeft, this.goalBottom);
            ctx.lineTo(this.goalLeft, this.goalTop);
            ctx.lineTo(this.goalRight, this.goalTop);
            ctx.lineTo(this.goalRight, this.goalBottom);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        triggerGoalExplosion() {
            const flash = document.getElementById('screenFlashOverlay');
            if (flash) {
                flash.classList.add('screen-flash-white');
                setTimeout(() => flash.classList.remove('screen-flash-white'), 450);
            }

            const container = document.getElementById('gameContainer') || document.body;
            container.classList.add('screen-shake');
            setTimeout(() => container.classList.remove('screen-shake'), 600);

            sound.playCrowdGoalRoar();

            if (cyberCanvas) {
                cyberCanvas.launchCelebration();
                setTimeout(() => cyberCanvas.launchCelebration(), 350);
            }

            if (this.goalBanner) {
                this.goalBanner.classList.remove('hidden');
            }

            if (narrator) {
                narrator.narrateIntroGol();
            }
        }

        finishIntro() {
            if (!this.running) return;
            this.running = false;
            if (this.animId) cancelAnimationFrame(this.animId);

            sound.stopStadiumMurmur();

            if (this.container) {
                this.container.classList.add('intro-zoom-out');
                setTimeout(() => {
                    this.container.style.display = 'none';
                }, 650);
            }
        }

        skipIntro() {
            this.running = false;
            if (this.animId) cancelAnimationFrame(this.animId);

            sound.stopStadiumMurmur();
            if (narrator && narrator.currentAudio) {
                try {
                    narrator.currentAudio.pause();
                    narrator.currentAudio.currentTime = 0;
                } catch(e) {}
            }

            if (this.container) {
                this.container.classList.add('intro-zoom-out');
                setTimeout(() => {
                    this.container.style.display = 'none';
                }, 300);
            }
        }

        skipImmediate() {
            this.running = false;
            sound.stopStadiumMurmur();
            if (narrator && narrator.currentAudio) {
                try {
                    narrator.currentAudio.pause();
                    narrator.currentAudio.currentTime = 0;
                } catch(e) {}
            }
            if (this.container) {
                this.container.style.display = 'none';
            }
        }
    }

    // =========================================================================
    // 2. CANVAS DE FONDO CYBERPUNK (Partículas y Cuadrícula Dinámica)
    // =========================================================================
    class CyberCanvas {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.maxParticles = 38;
            this.animId = null;
            this.enabled = true;

            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.initParticles();
            this.start();
        }

        resize() {
            if (!this.canvas) return;
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
        }

        initParticles() {
            this.particles = [];
            for (let i = 0; i < this.maxParticles; i++) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 0.45,
                    vy: (Math.random() - 0.5) * 0.45,
                    size: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.6 + 0.2,
                    color: Math.random() > 0.5 ? '#00f0ff' : '#b537f2'
                });
            }
        }

        start() {
            if (!this.enabled) return;
            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReduced) return;

            const draw = () => {
                if (!this.enabled) return;
                this.ctx.clearRect(0, 0, this.width, this.height);

                // Dibujar conexiones entre partículas cercanas
                for (let i = 0; i < this.particles.length; i++) {
                    const p1 = this.particles[i];
                    p1.x += p1.vx;
                    p1.y += p1.vy;

                    if (p1.x < 0) p1.x = this.width;
                    if (p1.x > this.width) p1.x = 0;
                    if (p1.y < 0) p1.y = this.height;
                    if (p1.y > this.height) p1.y = 0;

                    this.ctx.fillStyle = p1.color;
                    this.ctx.globalAlpha = p1.alpha;
                    this.ctx.beginPath();
                    this.ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
                    this.ctx.fill();

                    for (let j = i + 1; j < this.particles.length; j++) {
                        const p2 = this.particles[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 110) {
                            this.ctx.strokeStyle = '#00f0ff';
                            this.ctx.globalAlpha = (1 - dist / 110) * 0.12;
                            this.ctx.lineWidth = 0.8;
                            this.ctx.beginPath();
                            this.ctx.moveTo(p1.x, p1.y);
                            this.ctx.lineTo(p2.x, p2.y);
                            this.ctx.stroke();
                        }
                    }
                }
                this.ctx.globalAlpha = 1;
                this.animId = requestAnimationFrame(draw);
            };
            this.animId = requestAnimationFrame(draw);
        }

        stop() {
            if (this.animId) {
                cancelAnimationFrame(this.animId);
                this.animId = null;
            }
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.width, this.height);
            }
        }

        // Efecto confeti de neón al alcanzar nuevo récord
        launchCelebration() {
            if (!this.canvas || !this.ctx) return;
            const confettiPieces = [];
            const colors = ['#00f0ff', '#ffd000', '#b537f2', '#00ff88', '#ffffff'];

            for (let i = 0; i < 90; i++) {
                confettiPieces.push({
                    x: this.width / 2,
                    y: this.height / 2,
                    vx: (Math.random() - 0.5) * 14,
                    vy: (Math.random() - 0.8) * 12,
                    size: Math.random() * 5 + 3,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 1.0,
                    decay: Math.random() * 0.015 + 0.008
                });
            }

            const drawConfetti = () => {
                let alive = false;
                for (const c of confettiPieces) {
                    if (c.life > 0) {
                        alive = true;
                        c.x += c.vx;
                        c.y += c.vy;
                        c.vy += 0.25; // Gravedad
                        c.life -= c.decay;

                        this.ctx.fillStyle = c.color;
                        this.ctx.globalAlpha = Math.max(0, c.life);
                        this.ctx.fillRect(c.x, c.y, c.size, c.size);
                    }
                }
                this.ctx.globalAlpha = 1;
                if (alive) {
                    requestAnimationFrame(drawConfetti);
                }
            };
            requestAnimationFrame(drawConfetti);
        }
    }

    const cyberCanvas = new CyberCanvas('cyberCanvas');

    // =========================================================================
    // 2.5. GESTOR DE PERFIL DE JUGADOR, PROGRESIÓN, RANGOS Y XP
    // =========================================================================
    class UserProfileManager {
        constructor() {
            this.ranks = [
                { tier: 1, minXp: 0, maxXp: 150, name: 'POTRERO', icon: '⚽', desc: 'Tus primeros toques en el barrio' },
                { tier: 2, minXp: 151, maxXp: 400, name: 'INFERIORES', icon: '👟', desc: 'Formación táctica y disciplina' },
                { tier: 3, minXp: 401, maxXp: 800, name: 'RESERVA', icon: '🥉', desc: 'A un paso de la máxima categoría' },
                { tier: 4, minXp: 801, maxXp: 1400, name: 'PRIMERA', icon: '🥈', desc: 'Consagración profesional en primera' },
                { tier: 5, minXp: 1401, maxXp: 2200, name: 'SELECCIÓN', icon: '🥇', desc: 'Defendiendo la camiseta de tu país' },
                { tier: 6, minXp: 2201, maxXp: Infinity, name: 'LEYENDA', icon: '👑', desc: 'Inmortal en la historia del fútbol' }
            ];

            this.allAchievements = [
                { id: 'first_game', icon: '⚽', title: 'Bautismo de Fuego', desc: 'Completaste tu primera partida oficial en THE TIKI TAKA.' },
                { id: 'perfect_game', icon: '🎯', title: 'Ojo de Halcón', desc: 'Lograste un 100% de eficacia en una partida.' },
                { id: 'streak_3', icon: '⚡', title: 'Buena Racha', desc: 'Acertaste 3 preguntas seguidas en una partida.' },
                { id: 'streak_5', icon: '🔥', title: 'Furia Goleadora', desc: 'Racha imparable de 5 aciertos consecutivos.' },
                { id: 'speedy', icon: '⏱️', title: 'Reflejo Relámpago', desc: 'Respondiste correctamente en menos de 4 segundos.' },
                { id: 'lvl_2', icon: '👟', title: 'Salto a Inferiores', desc: 'Alcanzaste el Nivel 2 de experiencia deportiva.' },
                { id: 'lvl_5', icon: '🥇', title: 'Convocado Nacional', desc: 'Alcanzaste el Nivel 5 de experiencia.' },
                { id: 'legend', icon: '👑', title: 'Inmortal del Fútbol', desc: 'Alcanzaste el rango máximo de Leyenda (2200+ XP).' }
            ];

            this.data = this.load();
        }

        load() {
            try {
                const raw = localStorage.getItem('thetikitaka_user_profile') || localStorage.getItem('quizpy_user_profile');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.stats = parsed.stats || {};
                    parsed.achievements = parsed.achievements || [];
                    return parsed;
                }
            } catch (e) {
                console.warn('Error leyendo perfil de localStorage:', e);
            }

            const legacyName = localStorage.getItem('thetikitaka_player_name') || localStorage.getItem('quizpy_player_name') || 'Bau';
            return {
                name: legacyName,
                xp: 120,
                stats: {
                    games: 0,
                    correct: 0,
                    totalQuestions: 0,
                    maxStreak: 0,
                    totalPoints: 0
                },
                achievements: []
            };
        }

        save() {
            try {
                const json = JSON.stringify(this.data);
                localStorage.setItem('thetikitaka_user_profile', json);
                localStorage.setItem('thetikitaka_player_name', this.data.name);
                localStorage.setItem('quizpy_user_profile', json);
                localStorage.setItem('quizpy_player_name', this.data.name);
            } catch (e) {}
        }

        setName(newName) {
            const clean = (newName || '').trim();
            if (!clean) return;
            this.data.name = clean;
            this.save();
            this.updateHud();
        }

        getRank() {
            const xp = this.data.xp || 0;
            return this.ranks.find(r => xp >= r.minXp && xp <= r.maxXp) || this.ranks[this.ranks.length - 1];
        }

        getLevel() {
            const xp = this.data.xp || 0;
            if (xp < 150) return 1;
            if (xp < 400) return 2;
            if (xp < 800) return 3;
            if (xp < 1400) return 4;
            if (xp < 2200) return 5;
            return 6 + Math.floor((xp - 2200) / 1000);
        }

        getXpProgress() {
            const currentRank = this.getRank();
            const xp = this.data.xp || 0;
            const currentLvl = this.getLevel();

            let base = 0;
            let cap = 150;
            if (currentLvl === 1) { base = 0; cap = 150; }
            else if (currentLvl === 2) { base = 150; cap = 400; }
            else if (currentLvl === 3) { base = 400; cap = 800; }
            else if (currentLvl === 4) { base = 800; cap = 1400; }
            else if (currentLvl === 5) { base = 1400; cap = 2200; }
            else { base = 2200; cap = 3200; }

            const span = Math.max(1, cap - base);
            const progressInLevel = Math.max(0, xp - base);
            const pct = Math.min(100, Math.round((progressInLevel / span) * 100));
            const needed = Math.max(0, cap - xp);

            return {
                current: xp,
                needed,
                cap,
                pct,
                level: currentLvl,
                rank: currentRank
            };
        }

        addXp(amount, reason = '') {
            if (amount <= 0) return;
            const prevLvl = this.getLevel();
            this.data.xp = (this.data.xp || 0) + amount;
            const newLvl = this.getLevel();

            this.save();
            this.updateHud();

            try {
                const strip = document.querySelector('.player-hud-strip');
                const rect = strip ? strip.getBoundingClientRect() : { left: window.innerWidth / 2, top: 80 };
                cyberCanvas.createFloatingText(`+${amount} XP ${reason}`, rect.left + 150, rect.top + 30, '#00f0ff');
            } catch (e) {}

            if (newLvl > prevLvl) {
                this.onLevelUp(newLvl);
            }
        }

        onLevelUp(newLvl) {
            sound.playFanfare();
            cyberCanvas.triggerScreenFlash();
            cyberCanvas.triggerExplosionConfetti();
            const rank = this.getRank();
            if (newLvl >= 2) this.unlockAchievement('lvl_2');
            if (newLvl >= 5) this.unlockAchievement('lvl_5');
            if (rank.tier >= 6) this.unlockAchievement('legend');
        }

        recordAnswer(isCorrect, streak, timeSec) {
            this.data.stats.totalQuestions = (this.data.stats.totalQuestions || 0) + 1;
            if (isCorrect) {
                this.data.stats.correct = (this.data.stats.correct || 0) + 1;
                this.addXp(25, '¡Gol!');
                if (streak >= 3) this.unlockAchievement('streak_3');
                if (streak >= 5) this.unlockAchievement('streak_5');
                if (timeSec && timeSec < 4.0) this.unlockAchievement('speedy');
            } else {
                this.addXp(5, 'Ánimo');
            }
            if (streak > (this.data.stats.maxStreak || 0)) {
                this.data.stats.maxStreak = streak;
            }
            this.save();
        }

        recordGameFinished(points, total, maxStreak) {
            this.data.stats.games = (this.data.stats.games || 0) + 1;
            this.data.stats.totalPoints = (this.data.stats.totalPoints || 0) + points;
            if (maxStreak > (this.data.stats.maxStreak || 0)) {
                this.data.stats.maxStreak = maxStreak;
            }

            let bonus = 50;
            if (points === total && total > 0) {
                bonus += 100;
                this.unlockAchievement('perfect_game');
            }
            this.addXp(bonus, 'Fin de Partido');
            this.unlockAchievement('first_game');
            this.save();
            this.updateHud();
        }

        unlockAchievement(id) {
            if (!this.data.achievements) this.data.achievements = [];
            if (!this.data.achievements.includes(id)) {
                this.data.achievements.push(id);
                this.save();
                const ach = this.allAchievements.find(a => a.id === id);
                if (ach) {
                    try {
                        cyberCanvas.createFloatingText(`🏅 ¡LOGRO: ${ach.title}!`, window.innerWidth / 2 - 120, 160, '#ffd000');
                    } catch (e) {}
                }
            }
        }

        updateHud() {
            const p = this.getXpProgress();

            const inputHome = document.getElementById('homePlayerName');
            if (inputHome && document.activeElement !== inputHome) {
                inputHome.value = this.data.name;
            }

            const avatar = document.getElementById('hudPlayerAvatar');
            if (avatar) avatar.textContent = p.rank.icon;

            const rankBadge = document.getElementById('hudPlayerRankBadge');
            const rankIcon = document.getElementById('hudRankIcon');
            const rankName = document.getElementById('hudRankName');
            if (rankBadge) {
                rankBadge.className = `player-rank-badge rank-tier-${p.rank.tier}`;
            }
            if (rankIcon) rankIcon.textContent = p.rank.icon;
            if (rankName) rankName.textContent = p.rank.name;

            const lvlBadge = document.getElementById('hudLevelBadge');
            if (lvlBadge) lvlBadge.textContent = `NIVEL ${p.level}`;

            const xpNum = document.getElementById('hudXpNumbers');
            if (xpNum) xpNum.textContent = `${p.current} / ${p.cap} XP`;

            const xpFill = document.getElementById('hudXpFill');
            if (xpFill) xpFill.style.width = `${p.pct}%`;

            const xpTip = document.getElementById('hudXpTip');
            if (xpTip) {
                if (p.needed > 0) {
                    xpTip.textContent = `Faltan ${p.needed} XP para Nivel ${p.level + 1}`;
                } else {
                    xpTip.textContent = '¡Rango Máximo Alcanzado!';
                }
            }
        }

        renderProfileScreen() {
            this.updateHud();
            const p = this.getXpProgress();

            const profNameInput = document.getElementById('profNameInput');
            if (profNameInput) profNameInput.value = this.data.name;

            const profAvatarBig = document.getElementById('profAvatarBig');
            if (profAvatarBig) profAvatarBig.textContent = p.rank.icon;

            const profRankBadge = document.getElementById('profRankBadge');
            if (profRankBadge) {
                profRankBadge.className = `player-rank-badge rank-tier-${p.rank.tier}`;
                profRankBadge.innerHTML = `<span class="rank-icon">${p.rank.icon}</span> <span>${p.rank.name}</span>`;
            }

            const profLvlTag = document.getElementById('profLevelTag');
            if (profLvlTag) profLvlTag.textContent = `NIVEL ${p.level}`;

            const profXpText = document.getElementById('profXpText');
            if (profXpText) profXpText.textContent = `${p.current} XP acumulados`;

            const profXpNextText = document.getElementById('profXpNextText');
            if (profXpNextText) {
                profXpNextText.textContent = p.needed > 0 ? `Faltan ${p.needed} XP para Nivel ${p.level + 1}` : '¡Rango Máximo!';
            }

            const profXpFill = document.getElementById('profXpFill');
            if (profXpFill) profXpFill.style.width = `${p.pct}%`;

            const stats = this.data.stats || {};
            const games = stats.games || 0;
            const totalQ = stats.totalQuestions || 0;
            const correct = stats.correct || 0;
            const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

            const elGames = document.getElementById('profStatGames');
            if (elGames) elGames.textContent = games;

            const elAccuracy = document.getElementById('profStatAccuracy');
            if (elAccuracy) elAccuracy.textContent = `${accuracy}%`;

            const elStreak = document.getElementById('profStatStreak');
            if (elStreak) elStreak.textContent = stats.maxStreak || 0;

            const elPoints = document.getElementById('profStatPoints');
            if (elPoints) elPoints.textContent = stats.totalPoints || 0;

            const grid = document.getElementById('achievementsGrid');
            if (grid) {
                grid.innerHTML = '';
                const unlocked = this.data.achievements || [];
                this.allAchievements.forEach(ach => {
                    const isUnlocked = unlocked.includes(ach.id);
                    const card = document.createElement('div');
                    card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
                    card.innerHTML = `
                        <div class="ach-icon">${ach.icon}</div>
                        <div class="ach-info">
                            <div class="ach-title">${escapeHtml(ach.title)} ${isUnlocked ? '✅' : '🔒'}</div>
                            <div class="ach-desc">${escapeHtml(ach.desc)}</div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            }
        }
    }

    const userProfile = new UserProfileManager();
    window.userProfile = userProfile;

    // =========================================================================
    // 2.8. CONTROLADOR DE NAVEGACIÓN DEL MENÚ PRINCIPAL (TECLADO, MOUSE, TOUCH)
    // =========================================================================
    class MenuNavigator {
        constructor(cardsContainerId, onSelectCallback) {
            this.container = document.getElementById(cardsContainerId);
            this.onSelect = onSelectCallback;
            this.cards = [];
            this.focusedIndex = 0;
            this.init();
        }

        init() {
            if (!this.container) return;
            this.cards = Array.from(this.container.querySelectorAll('.menu-card'));
            if (!this.cards.length) return;

            this.cards.forEach((card, idx) => {
                card.addEventListener('mouseenter', () => {
                    if (this.focusedIndex !== idx) {
                        this.setFocus(idx, true);
                    }
                });

                card.addEventListener('click', () => {
                    this.setFocus(idx, false);
                    this.activateCurrent();
                });
            });

            this.setFocus(0, false);
        }

        setFocus(index, playSfx = true) {
            if (index < 0 || index >= this.cards.length) return;
            this.cards.forEach((c, i) => {
                if (i === index) {
                    c.classList.add('card-focused');
                    c.setAttribute('aria-selected', 'true');
                } else {
                    c.classList.remove('card-focused');
                    c.setAttribute('aria-selected', 'false');
                }
            });
            this.focusedIndex = index;
            if (playSfx) sound.playMenuMove();
        }

        move(direction) {
            let next = this.focusedIndex;

            if (direction === 'right') {
                next = (this.focusedIndex + 1) % this.cards.length;
            } else if (direction === 'left') {
                next = (this.focusedIndex - 1 + this.cards.length) % this.cards.length;
            } else if (direction === 'down') {
                if (this.focusedIndex === 0) {
                    next = 2;
                } else if (this.focusedIndex >= 1 && this.focusedIndex <= 3) {
                    next = this.focusedIndex + 3;
                } else {
                    next = 0;
                }
            } else if (direction === 'up') {
                if (this.focusedIndex === 0) {
                    next = 5;
                } else if (this.focusedIndex >= 4 && this.focusedIndex <= 6) {
                    next = this.focusedIndex - 3;
                } else {
                    next = 0;
                }
            }

            this.setFocus(next, true);
            try {
                this.cards[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (e) {}
        }

        activateCurrent() {
            sound.playMenuSelect();
            const card = this.cards[this.focusedIndex];
            if (!card) return;
            const action = card.getAttribute('data-action');
            if (this.onSelect) {
                this.onSelect(action, card);
            }
        }
    }

    // =========================================================================
    // 3. ESTADO GLOBAL DE LA APLICACIÓN
    // =========================================================================
    const state = {
        sessionId: null,
        playerName: 'Anónimo',
        currentQuestion: null,
        isAnswering: false,
        totalQuestions: 5,
        timerActive: false,
        timerSecondsTotal: 15,
        timerSecondsLeft: 15,
        timerInterval: null,
        questionStartTime: 0,
        lastGameSummary: null,
        isWorldCup: false,
        powerups: {
            '50_50': true,
            'var': true,
            'tiempo_extra': true,
            'hinchada': true
        },
        orderingState: [],
        clueTimerInterval: null,
        config: {
            sound: true,
            narrator: true,
            animations: true,
            questionCount: 5,
            timerActive: false,
            timerSeconds: 15
        }
    };

    // =========================================================================
    // 4. ELEMENTOS DEL DOM
    // =========================================================================
    const screens = {
        home: document.getElementById('screenHome'),
        setup: document.getElementById('screenSetup'),
        game: document.getElementById('screenGame'),
        results: document.getElementById('screenResults'),
        review: document.getElementById('screenReview'),
        records: document.getElementById('screenRecords'),
        profile: document.getElementById('screenProfile'),
        worldcup: document.getElementById('screenWorldCupArena'),
        penalties: document.getElementById('screenPenaltiesArena'),
        tikidle: document.getElementById('screenTikidle')
    };

    const modals = {
        help: document.getElementById('modalHelp'),
        leave: document.getElementById('modalConfirmLeave'),
        worldcup: document.getElementById('modalWorldCup'),
        penalties: document.getElementById('modalPenalties'),
        daily: document.getElementById('modalDaily'),
        varClue: document.getElementById('modalVarClue'),
        crowd: document.getElementById('modalCrowdVoting'),
        tikidleEnd: document.getElementById('modalTikidleEnd'),
        tikidleHelp: document.getElementById('modalTikidleHelp')
    };

    // =========================================================================
    // 4.5. COMODINES (POWER-UPS) Y APOYO TÁCTICO
    // =========================================================================
    function actualizarBotonesComodines() {
        const pMap = {
            '50_50': ['btnPowerup5050', 'btnWc5050'],
            'var': ['btnPowerupVar', 'btnWcVar'],
            'tiempo_extra': ['btnPowerupTime', 'btnWcTime'],
            'hinchada': ['btnPowerupCrowd', 'btnWcCrowd']
        };

        Object.entries(pMap).forEach(([tipo, btnIds]) => {
            const available = state.powerups[tipo];
            btnIds.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    if (available) {
                        btn.classList.remove('powerup-used');
                        btn.disabled = false;
                    } else {
                        btn.classList.add('powerup-used');
                        btn.disabled = true;
                    }
                }
            });
        });
    }

    async function usarComodin(tipo) {
        if (!state.sessionId || !state.powerups[tipo] || state.isAnswering) return;
        sound.playClick();

        try {
            const res = await fetch('/api/game/powerup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: state.sessionId,
                    comodin: tipo
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.error || 'No se pudo activar el comodín.');
                return;
            }

            state.powerups[tipo] = false;
            actualizarBotonesComodines();

            const resultado = data.resultado;

            if (tipo === '50_50') {
                sound.playPowerupEffect();
                const descartadas = resultado.opciones_descartadas || [];
                const selector = state.isWorldCup ? '#wcOptionsGrid .option-btn' : '#optionsGrid .option-btn';
                const btns = document.querySelectorAll(selector);
                btns.forEach(b => {
                    const txt = b.getAttribute('data-option');
                    if (descartadas.includes(txt)) {
                        b.classList.add('opt-eliminated');
                        b.disabled = true;
                    }
                });
                cyberCanvas.createFloatingText('✂️ 50/50 ACTIVADO', window.innerWidth / 2, 220, '#00f0ff');
            } else if (tipo === 'var') {
                sound.playPowerupEffect();
                const pista = resultado.pista || 'Sin información adicional en este momento.';
                const textEl = document.getElementById('varClueContentText');
                if (textEl) textEl.textContent = pista;
                openModal(modals.varClue);
            } else if (tipo === 'tiempo_extra') {
                sound.playPowerupEffect();
                state.timerSecondsLeft += 10;
                const timerText = document.getElementById('hudTimer');
                if (timerText) {
                    timerText.textContent = `${state.timerSecondsLeft}s`;
                    timerText.classList.remove('text-neon-red');
                    timerText.classList.add('text-neon-cyan');
                }
                const wcTimer = document.getElementById('wcTimer');
                if (wcTimer) {
                    wcTimer.textContent = `${state.timerSecondsLeft}s`;
                }
                cyberCanvas.createFloatingText('+10s TIEMPO EXTRA ⏳', window.innerWidth / 2, 220, '#00ff88');
            } else if (tipo === 'hinchada') {
                sound.playPowerupEffect();
                const dist = resultado.distribucion || {};
                renderizarGraficoHinchada(dist);
                openModal(modals.crowd);
            }
        } catch (e) {
            console.error('Error usando comodín:', e);
        }
    }

    function renderizarGraficoHinchada(distribucion) {
        const container = document.getElementById('crowdBarsContainer');
        if (!container) return;
        container.innerHTML = '';

        let maxVal = -1;
        let maxKey = null;
        Object.entries(distribucion).forEach(([opc, val]) => {
            if (val > maxVal) {
                maxVal = val;
                maxKey = opc;
            }
        });

        Object.entries(distribucion).forEach(([opc, val]) => {
            const isFav = (opc === maxKey);
            const row = document.createElement('div');
            row.className = `crowd-bar-row ${isFav ? 'crowd-favorite' : ''}`;
            row.innerHTML = `
                <div class="crowd-bar-label">
                    <span class="crowd-opc-name">${escapeHtml(opc)}</span>
                    <span class="crowd-opc-pct ${isFav ? 'text-neon-cyan font-bold' : ''}">${val}% ${isFav ? '🔥' : ''}</span>
                </div>
                <div class="crowd-bar-track">
                    <div class="crowd-bar-fill ${isFav ? 'fill-fav' : ''}" style="width: ${val}%;"></div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    // =========================================================================
    // 5. NAVEGACIÓN Y GESTIÓN DE PANTALLAS
    // =========================================================================
    function showScreen(name) {
        sound.playTransition();
        Object.entries(screens).forEach(([key, el]) => {
            if (key === name) {
                el.classList.add('screen-active');
            } else {
                el.classList.remove('screen-active');
            }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openModal(modalEl) {
        sound.playClick();
        if (modalEl) modalEl.classList.remove('hidden');
    }

    function closeModal(modalEl) {
        sound.playClick();
        if (modalEl) modalEl.classList.add('hidden');
    }

    // =========================================================================
    // 6. CONTROLADOR DE PARTIDA
    // =========================================================================

    async function cargarEstadisticasInicio() {
        try {
            const res = await fetch('/api/info');
            const data = await res.json();
            if (data.success && data.estadisticas) {
                const s = data.estadisticas;
                document.getElementById('statRecordMax').textContent = `${s.max_puntos} pts (${s.mejor_jugador})`;
                document.getElementById('statTotalGames').textContent = s.total_partidas;
                document.getElementById('statTotalQuestions').textContent = s.total_preguntas;

                // Actualizar slider de configuración con el total real
                const slider = document.getElementById('cfgQuestionCount');
                const sliderMax = document.getElementById('cfgSliderMax');
                if (slider && sliderMax && s.total_preguntas > 0) {
                    slider.max = s.total_preguntas;
                    slider.value = s.total_preguntas;
                    sliderMax.textContent = s.total_preguntas;
                    document.getElementById('cfgQuestionCountVal').textContent = s.total_preguntas;
                    state.config.questionCount = s.total_preguntas;
                }
            }
        } catch (e) {
            console.warn('No se pudieron obtener estadísticas:', e);
        }
    }

    async function iniciarPartida(nombreJugador, cantidad, conTiempo, segundos, extraOpts = {}) {
        sound.init();
        sound.playClick();

        state.isWorldCup = Boolean(extraOpts.isWorldCup);
        state.powerups = { '50_50': true, 'var': true, 'tiempo_extra': true, 'hinchada': true };
        actualizarBotonesComodines();

        const payload = {
            nombre: nombreJugador || 'Anónimo',
            cantidad: parseInt(cantidad) || 5,
            con_tiempo: Boolean(conTiempo),
            segundos: parseInt(segundos) || 15,
            modo: extraOpts.modo || 'clasico',
            fase_mundial: extraOpts.fase_mundial || null,
            dificultad: extraOpts.dificultad || null
        };

        try {
            const res = await fetch('/api/game/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.error || 'Error al iniciar la partida.');
                return;
            }

            state.sessionId = data.session_id;
            state.playerName = data.nombre;
            state.totalQuestions = data.total_preguntas;
            state.timerActive = data.con_tiempo;
            state.timerSecondsTotal = data.segundos;

            // Renderizar primera pregunta en la arena correspondiente
            renderizarPregunta(data.pregunta);
            if (state.isWorldCup) {
                showScreen('worldcup');
            } else {
                showScreen('game');
            }

        } catch (err) {
            console.error('Error al iniciar:', err);
            alert('No se pudo conectar con el servidor.');
        }
    }

    function renderizarPregunta(pregunta) {
        if (!pregunta) return;

        state.currentQuestion = pregunta;
        state.isAnswering = false;
        state.questionStartTime = performance.now();

        if (state.clueTimerInterval) {
            clearInterval(state.clueTimerInterval);
            state.clueTimerInterval = null;
        }

        const isWc = state.isWorldCup;

        // Ocultar banner de feedback
        const fbBannerId = isWc ? 'wcFeedbackBanner' : 'feedbackBanner';
        const feedbackBanner = document.getElementById(fbBannerId);
        if (feedbackBanner) feedbackBanner.classList.add('hidden');

        // Actualizar HUD
        if (isWc) {
            const wcCurQ = document.getElementById('wcCurrentQ');
            if (wcCurQ) wcCurQ.textContent = pregunta.numero;
            const wcTotQ = document.getElementById('wcTotalQ');
            if (wcTotQ) wcTotQ.textContent = pregunta.total;
            const wcScore = document.getElementById('wcScore');
            if (wcScore) wcScore.textContent = pregunta.puntos_actuales;
        } else {
            const curQ = document.getElementById('hudCurrentQ');
            if (curQ) curQ.textContent = pregunta.numero;
            const totQ = document.getElementById('hudTotalQ');
            if (totQ) totQ.textContent = pregunta.total;
            const scoreEl = document.getElementById('hudScore');
            if (scoreEl) scoreEl.textContent = pregunta.puntos_actuales;

            // Barra de progreso láser
            const progressPct = ((pregunta.numero - 1) / pregunta.total) * 100;
            const progBar = document.getElementById('progressBar');
            if (progBar) progBar.style.width = `${progressPct}%`;

            // Racha
            const streakPill = document.getElementById('hudStreakPill');
            const streakEl = document.getElementById('hudStreak');
            if (streakPill && streakEl) {
                if (pregunta.racha > 1) {
                    streakPill.classList.remove('hidden');
                    streakEl.textContent = `🔥 x${pregunta.racha}`;
                } else {
                    streakPill.classList.add('hidden');
                }
            }
        }

        // Categoría y Dificultad
        const catTagId = isWc ? 'wcCategoryTag' : 'questionCategoryTag';
        const diffTagId = isWc ? 'wcDiffBadge' : 'questionDifficultyTag';
        const catTag = document.getElementById(catTagId);
        const diffTag = document.getElementById(diffTagId);

        if (catTag) {
            catTag.textContent = pregunta.categoria ? `⚽ ${pregunta.categoria.toUpperCase()}` : (isWc ? '🏆 MUNDIAL' : '⚡ ARENA DE FÚTBOL');
        }
        if (diffTag) {
            const d = (pregunta.dificultad || 'medio').toLowerCase();
            diffTag.textContent = d.toUpperCase();
            diffTag.className = `question-diff-badge diff-${d}`;
        }

        // Texto de la pregunta
        const qTextId = isWc ? 'wcQuestionText' : 'questionText';
        const qTextEl = document.getElementById(qTextId);
        if (qTextEl) qTextEl.textContent = pregunta.pregunta;

        // Identificadores de contenedores de opciones
        const optionsGridId = isWc ? 'wcOptionsGrid' : 'optionsGrid';
        const tfGridId = isWc ? 'wcTrueFalseGrid' : 'trueFalseGrid';
        const cluesContId = isWc ? 'wcCluesContainer' : 'cluesContainer';
        const orderingContId = isWc ? 'wcOrderingContainer' : 'orderingContainer';

        const optionsGrid = document.getElementById(optionsGridId);
        const trueFalseGrid = document.getElementById(tfGridId);
        const cluesContainer = document.getElementById(cluesContId);
        const orderingContainer = document.getElementById(orderingContId);

        if (optionsGrid) optionsGrid.classList.add('hidden');
        if (trueFalseGrid) trueFalseGrid.classList.add('hidden');
        if (cluesContainer) cluesContainer.classList.add('hidden');
        if (orderingContainer) orderingContainer.classList.add('hidden');

        const tipo = pregunta.tipo || 'multiple_choice';

        if (tipo === 'verdadero_falso') {
            if (trueFalseGrid) {
                trueFalseGrid.classList.remove('hidden');
                const btns = trueFalseGrid.querySelectorAll('.tf-btn');
                btns.forEach(btn => {
                    btn.classList.remove('opt-correct', 'opt-wrong', 'opt-revealed');
                    btn.disabled = false;
                    btn.onclick = () => {
                        if (!state.isAnswering) enviarRespuesta(btn.getAttribute('data-option'), btn);
                    };
                });
            }
        } else if (tipo === 'pistas') {
            if (cluesContainer) {
                cluesContainer.classList.remove('hidden');
                const clues = pregunta.pistas || [pregunta.pregunta, 'Segunda pista disponible'];
                const clue1Id = isWc ? 'wcClueText1' : 'clueText1';
                const clue2Id = isWc ? 'wcClueText2' : 'clueText2';
                const card2Id = isWc ? 'wcClueCard2' : 'clueCard2';
                const btnUnlockId = isWc ? 'btnWcUnlockClue2' : 'btnUnlockClue2';
                const timerId = isWc ? 'wcClueTimer' : 'clueCountdownTimer';
                const gridId = isWc ? 'wcCluesOptionsGrid' : 'cluesOptionsGrid';

                const clue1Text = document.getElementById(clue1Id);
                const clue2Text = document.getElementById(clue2Id);
                const clueCard2 = document.getElementById(card2Id);
                const btnUnlock2 = document.getElementById(btnUnlockId);
                const timerEl = document.getElementById(timerId);

                if (clue1Text) clue1Text.textContent = clues[0];
                if (clue2Text) clue2Text.textContent = '🔒 Pista 2 bloqueada. Desbloqueá con el botón o esperá 5s.';
                if (clueCard2) clueCard2.className = 'clue-card clue-locked';

                let countdown = 5;
                if (timerEl) timerEl.textContent = `${countdown}s`;

                const unlockClue2 = () => {
                    if (state.clueTimerInterval) {
                        clearInterval(state.clueTimerInterval);
                        state.clueTimerInterval = null;
                    }
                    if (clueCard2) clueCard2.className = 'clue-card clue-active';
                    if (clue2Text) clue2Text.textContent = clues[1] || 'Sin pista adicional.';
                    if (timerEl) timerEl.textContent = 'Revelada';
                    if (btnUnlock2) btnUnlock2.disabled = true;
                };

                if (btnUnlock2) {
                    btnUnlock2.disabled = false;
                    btnUnlock2.onclick = unlockClue2;
                }

                state.clueTimerInterval = setInterval(() => {
                    countdown--;
                    if (timerEl) timerEl.textContent = `${countdown}s`;
                    if (countdown <= 0) {
                        unlockClue2();
                    }
                }, 1000);

                const cGrid = document.getElementById(gridId);
                if (cGrid) {
                    cGrid.innerHTML = '';
                    const keys = ['A', 'B', 'C', 'D'];
                    pregunta.opciones.forEach((opcText, idx) => {
                        const btn = document.createElement('button');
                        btn.className = 'option-btn';
                        btn.setAttribute('data-option', opcText);
                        btn.innerHTML = `<span class="option-key">${keys[idx] || (idx + 1)}</span><span class="option-text">${escapeHtml(opcText)}</span>`;
                        btn.onclick = () => {
                            if (!state.isAnswering) enviarRespuesta(opcText, btn);
                        };
                        cGrid.appendChild(btn);
                    });
                }
            }
        } else if (tipo === 'ordenar') {
            if (orderingContainer) {
                orderingContainer.classList.remove('hidden');
                const listId = isWc ? 'wcOrderingItemsList' : 'orderingItemsList';
                const btnConfirmId = isWc ? 'btnWcConfirmOrdering' : 'btnConfirmOrdering';
                const listEl = document.getElementById(listId);
                const btnConfirm = document.getElementById(btnConfirmId);

                state.orderingState = [...(pregunta.opciones || [])];

                const renderOrdering = () => {
                    listEl.innerHTML = '';
                    state.orderingState.forEach((item, idx) => {
                        const itemEl = document.createElement('div');
                        itemEl.className = 'ordering-item';
                        itemEl.innerHTML = `
                            <span class="ordering-pos">${idx + 1}</span>
                            <span class="ordering-label">${escapeHtml(item)}</span>
                            <div class="ordering-arrows">
                                <button type="button" class="btn-arrow-order btn-arrow-up" ${idx === 0 ? 'disabled' : ''}>▲</button>
                                <button type="button" class="btn-arrow-order btn-arrow-down" ${idx === state.orderingState.length - 1 ? 'disabled' : ''}>▼</button>
                            </div>
                        `;
                        const up = itemEl.querySelector('.btn-arrow-up');
                        const down = itemEl.querySelector('.btn-arrow-down');

                        up.onclick = () => {
                            if (idx > 0) {
                                sound.playClick();
                                const temp = state.orderingState[idx - 1];
                                state.orderingState[idx - 1] = state.orderingState[idx];
                                state.orderingState[idx] = temp;
                                renderOrdering();
                            }
                        };
                        down.onclick = () => {
                            if (idx < state.orderingState.length - 1) {
                                sound.playClick();
                                const temp = state.orderingState[idx + 1];
                                state.orderingState[idx + 1] = state.orderingState[idx];
                                state.orderingState[idx] = temp;
                                renderOrdering();
                            }
                        };
                        listEl.appendChild(itemEl);
                    });
                };

                renderOrdering();

                if (btnConfirm) {
                    btnConfirm.disabled = false;
                    btnConfirm.onclick = () => {
                        if (!state.isAnswering) {
                            const joined = state.orderingState.join(', ');
                            enviarRespuesta(joined, btnConfirm);
                        }
                    };
                }
            }
        } else {
            // multiple_choice por defecto
            if (optionsGrid) {
                optionsGrid.classList.remove('hidden');
                optionsGrid.innerHTML = '';
                const keys = ['A', 'B', 'C', 'D', 'E', 'F'];

                pregunta.opciones.forEach((opcText, idx) => {
                    const keyLabel = keys[idx] || (idx + 1);
                    const btn = document.createElement('button');
                    btn.className = 'option-btn';
                    btn.setAttribute('data-option', opcText);
                    btn.setAttribute('data-index', idx + 1);

                    btn.innerHTML = `
                        <span class="option-key">${keyLabel}</span>
                        <span class="option-text">${escapeHtml(opcText)}</span>
                    `;

                    btn.addEventListener('click', () => {
                        if (!state.isAnswering) {
                            enviarRespuesta(opcText, btn);
                        }
                    });

                    optionsGrid.appendChild(btn);
                });
            }
        }

        // Temporizador
        iniciarTemporizador();
    }

    function iniciarTemporizador() {
        detenerTemporizador();
        const isWc = state.isWorldCup;
        const timerPill = document.getElementById(isWc ? 'wcTimerPill' : 'hudTimerPill');
        const timerText = document.getElementById(isWc ? 'wcTimer' : 'hudTimer');

        if (!state.timerActive) {
            if (timerPill) timerPill.classList.add('hidden');
            return;
        }

        if (timerPill) timerPill.classList.remove('hidden');
        state.timerSecondsLeft = state.timerSecondsTotal;
        if (timerText) {
            timerText.textContent = `${state.timerSecondsLeft}s`;
            timerText.classList.remove('text-neon-red');
            timerText.classList.add('text-neon-cyan');
        }

        state.timerInterval = setInterval(() => {
            state.timerSecondsLeft--;

            if (timerText) {
                if (state.timerSecondsLeft <= 5 && state.timerSecondsLeft > 0) {
                    timerText.classList.remove('text-neon-cyan');
                    timerText.classList.add('text-neon-red');
                    sound.playTick();
                }
                timerText.textContent = `${state.timerSecondsLeft}s`;
            }

            if (state.timerSecondsLeft <= 0) {
                detenerTemporizador();
                enviarRespuesta(null, null);
            }
        }, 1000);
    }

    function detenerTemporizador() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        if (state.clueTimerInterval) {
            clearInterval(state.clueTimerInterval);
            state.clueTimerInterval = null;
        }
    }

    async function enviarRespuesta(opcionSeleccionada, botonSeleccionado) {
        if (state.isAnswering) return;
        state.isAnswering = true;
        detenerTemporizador();

        const tiempoEmpleado = (performance.now() - state.questionStartTime) / 1000;

        // Deshabilitar todos los botones de opciones
        const allBtns = document.querySelectorAll('.option-btn, .tf-btn');
        allBtns.forEach(b => b.disabled = true);

        try {
            const res = await fetch('/api/game/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: state.sessionId,
                    opcion: opcionSeleccionada,
                    tiempo_empleado: tiempoEmpleado
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.error || 'Error al validar respuesta.');
                return;
            }

            const r = data.resultado;

            // Actualizar HUD puntaje y racha
            const scoreTarget = state.isWorldCup ? document.getElementById('wcScore') : document.getElementById('hudScore');
            if (scoreTarget) scoreTarget.textContent = r.puntos;

            if (window.userProfile) {
                userProfile.recordAnswer(r.acerto, r.racha, tiempoEmpleado);
            }

            if (!state.isWorldCup) {
                const streakPill = document.getElementById('hudStreakPill');
                const streakEl = document.getElementById('hudStreak');
                if (r.racha > 1) {
                    streakPill.classList.remove('hidden');
                    streakEl.textContent = `🔥 x${r.racha}`;
                } else {
                    streakPill.classList.add('hidden');
                }
            }

            // Efectos visuales y relator
            if (r.acerto) {
                sound.playCorrect();
                narrator.narrateGoal(r.racha);
                if (botonSeleccionado) botonSeleccionado.classList.add('opt-correct');
                mostrarFeedback(true, '¡CORRECTO!', 'Sumaste +1 punto a tu marcador.');
            } else {
                sound.playIncorrect();
                if (opcionSeleccionada === null) {
                    narrator.narrateTimeout();
                } else {
                    narrator.narrateMiss();
                }
                if (botonSeleccionado) botonSeleccionado.classList.add('opt-wrong');
                // Revelar la respuesta correcta en los botones
                allBtns.forEach(btn => {
                    if (btn.getAttribute('data-option') === r.respuesta_correcta) {
                        btn.classList.add('opt-revealed');
                    }
                });
                const motivo = (opcionSeleccionada === null) ? '¡Se agotó el tiempo límite!' : 'Respuesta errónea.';
                mostrarFeedback(false, motivo, `La respuesta correcta era: ${r.respuesta_correcta}`);
            }

            // Configurar botón Siguiente
            const nextBtnId = state.isWorldCup ? 'btnWcNextQuestion' : 'btnNextQuestion';
            const btnNext = document.getElementById(nextBtnId);
            if (btnNext) {
                if (r.es_ultima) {
                    btnNext.innerHTML = '<span>FINALIZAR JUGADA 🏁</span>';
                    btnNext.onclick = finalizarPartida;
                } else {
                    btnNext.innerHTML = '<span>SIGUIENTE ▶</span>';
                    btnNext.onclick = avanzarPregunta;
                }
            }

        } catch (err) {
            console.error('Error al responder:', err);
            alert('Error de conexión al enviar tu respuesta.');
        }
    }

    function mostrarFeedback(acerto, titulo, desc) {
        const isWc = state.isWorldCup;
        const bannerId = isWc ? 'wcFeedbackBanner' : 'feedbackBanner';
        const iconId = isWc ? 'wcFeedbackIcon' : 'feedbackIcon';
        const titleId = isWc ? 'wcFeedbackTitle' : 'feedbackTitle';
        const descId = isWc ? 'wcFeedbackDesc' : 'feedbackDesc';

        const banner = document.getElementById(bannerId);
        const icon = document.getElementById(iconId);
        const titleEl = document.getElementById(titleId);
        const descEl = document.getElementById(descId);

        if (icon) icon.textContent = acerto ? '✅' : '❌';
        if (titleEl) {
            titleEl.textContent = titulo;
            titleEl.className = `feedback-title ${acerto ? 'text-neon-green' : 'text-neon-red'}`;
        }
        if (descEl) descEl.textContent = desc;
        if (banner) banner.classList.remove('hidden');
    }

    async function avanzarPregunta() {
        sound.playClick();
        try {
            const res = await fetch('/api/game/next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: state.sessionId })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.error || 'Error al avanzar de pregunta.');
                return;
            }

            if (data.avance.finalizado) {
                await finalizarPartida();
            } else {
                renderizarPregunta(data.avance.pregunta);
            }
        } catch (err) {
            console.error('Error al avanzar:', err);
        }
    }

    async function finalizarPartida() {
        sound.playClick();
        detenerTemporizador();

        try {
            const res = await fetch('/api/game/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: state.sessionId })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.error || 'Error al guardar los resultados.');
                return;
            }

            state.lastGameSummary = data.resumen;
            if (window.userProfile) {
                userProfile.recordGameFinished(data.resumen.puntos, data.resumen.total, data.resumen.racha_max);
            }

            if (state.isWorldCup && window.worldCupEngine) {
                worldCupEngine.onStageFinished(data.resumen.puntos, data.resumen.total);
            } else {
                mostrarResultados(data.resumen);
            }

        } catch (err) {
            console.error('Error al finalizar:', err);
            alert('Error al contactar con el servidor.');
        }
    }

    function mostrarResultados(resumen) {
        document.getElementById('resultsPlayerName').textContent = `Jugador: ${resumen.nombre}`;
        document.getElementById('finalScoreVal').textContent = resumen.puntos;
        document.getElementById('finalTotalVal').textContent = `/ ${resumen.total}`;
        document.getElementById('finalPercentage').textContent = `${resumen.porcentaje}% DE EFICACIA`;

        document.getElementById('metricCorrect').textContent = resumen.correctas;
        document.getElementById('metricIncorrect').textContent = resumen.incorrectas;
        document.getElementById('metricStreak').textContent = resumen.racha_max;
        document.getElementById('metricTime').textContent = `${resumen.tiempo_segundos}s`;

        // Veredicto según porcentaje
        const verdictEl = document.getElementById('resultsVerdict');
        if (resumen.porcentaje === 100) {
            verdictEl.textContent = '¡DESEMPEÑO PERFECTO! 👑';
            verdictEl.className = 'results-verdict text-neon-yellow';
        } else if (resumen.porcentaje >= 75) {
            verdictEl.textContent = '¡EXCELENTE JUGADA! ⚡';
            verdictEl.className = 'results-verdict text-neon-cyan';
        } else if (resumen.porcentaje >= 50) {
            verdictEl.textContent = '¡BUEN INTENTO! 🎯';
            verdictEl.className = 'results-verdict text-neon-violet';
        } else {
            verdictEl.textContent = '¡SEGUÍ PRACTICANDO! 🚀';
            verdictEl.className = 'results-verdict text-neon-blue';
        }

        // Celebración de nuevo récord
        const celebBox = document.getElementById('recordCelebration');
        if (resumen.es_nuevo_record) {
            celebBox.classList.remove('hidden');
            sound.playFanfare();
            cyberCanvas.launchCelebration();
        } else {
            celebBox.classList.add('hidden');
            sound.playTransition();
        }

        showScreen('results');
        cargarEstadisticasInicio();
    }

    function mostrarRepaso() {
        if (!state.lastGameSummary || !state.lastGameSummary.respuestas) {
            alert('No hay respuestas para revisar.');
            return;
        }

        sound.playClick();
        const list = document.getElementById('reviewList');
        list.innerHTML = '';

        state.lastGameSummary.respuestas.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = `review-item ${item.acerto ? 'is-correct' : 'is-wrong'}`;

            card.innerHTML = `
                <div class="review-header">
                    <span>PREGUNTA #${idx + 1}</span>
                    <span class="${item.acerto ? 'text-neon-green' : 'text-neon-red'}">${item.acerto ? 'CORRECTO ✅' : 'INCORRECTO ❌'}</span>
                </div>
                <div class="review-q-text">${escapeHtml(item.pregunta)}</div>
                <div class="review-details">
                    <div class="review-choice">
                        <span class="review-choice-label">TU RESPUESTA</span>
                        <strong class="${item.acerto ? 'text-neon-green' : 'text-neon-red'}">${escapeHtml(item.respondio)}</strong>
                    </div>
                    <div class="review-choice">
                        <span class="review-choice-label">RESPUESTA CORRECTA</span>
                        <strong class="text-neon-green">${escapeHtml(item.correcta)}</strong>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });

        showScreen('review');
    }

    async function cargarTablaRecords() {
        sound.playClick();
        const tbody = document.getElementById('recordsTableBody');
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Cargando récords...</td></tr>';

        try {
            const res = await fetch('/api/records?limite=30');
            const data = await res.json();
            if (!data.success || !Array.isArray(data.records)) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No se pudieron cargar los récords.</td></tr>';
                return;
            }

            if (data.records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Todavía no hay récords registrados. ¡Sé el primero!</td></tr>';
                return;
            }

            tbody.innerHTML = '';

            data.records.forEach((r, idx) => {
                const tr = document.createElement('tr');
                const pos = idx + 1;

                let rankBadge = `${pos}`;
                if (pos === 1) rankBadge = '<span class="rank-badge rank-1">🥇</span>';
                else if (pos === 2) rankBadge = '<span class="rank-badge rank-2">🥈</span>';
                else if (pos === 3) rankBadge = '<span class="rank-badge rank-3">🥉</span>';

                const total = r.total || 5;
                const pts = r.puntos || 0;
                const pct = Math.round((pts / total) * 100);

                tr.innerHTML = `
                    <td>${rankBadge}</td>
                    <td class="record-player-cell">${escapeHtml(r.nombre || 'Anónimo')}</td>
                    <td class="record-pts-cell">${pts} / ${total}</td>
                    <td><span class="badge-pct text-neon-cyan">${pct}%</span></td>
                    <td class="text-muted">${escapeHtml(r.fecha || '—')}</td>
                `;

                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error('Error al cargar récords:', err);
            tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error de conexión al cargar la tabla.</td></tr>';
        }
    }

    // =========================================================================
    // 6.5. MODO CAMINO AL MUNDIAL
    // 5 fases clasificatorias eliminatorias con dificultad creciente.
    // =========================================================================
    class WorldCupEngine {
        constructor() {
            this.stages = [
                { id: 'fase_grupos', name: 'GRUPOS', title: 'Fase de Grupos', count: 3, req: 2, diff: 'facil' },
                { id: 'octavos', name: 'OCTAVOS', title: 'Octavos de Final', count: 3, req: 2, diff: 'medio' },
                { id: 'cuartos', name: 'CUARTOS', title: 'Cuartos de Final', count: 3, req: 2, diff: 'medio' },
                { id: 'semifinal', name: 'SEMIFINAL', title: 'Semifinales', count: 4, req: 3, diff: 'dificil' },
                { id: 'final', name: 'FINAL', title: 'Gran Final', count: 5, req: 4, diff: 'dificil' }
            ];
            this.currentStageIdx = 0;
            this.totalScore = 0;
            this.setupListeners();
        }

        setupListeners() {
            const btnRetry = document.getElementById('btnWcRetry');
            if (btnRetry) {
                btnRetry.addEventListener('click', () => {
                    this.hideOverlays();
                    this.startTournament();
                });
            }

            const btnExit = document.getElementById('btnWcExitMenu');
            if (btnExit) {
                btnExit.addEventListener('click', () => {
                    this.hideOverlays();
                    showScreen('home');
                });
            }

            const btnCelebrate = document.getElementById('btnWcCelebrateExit');
            if (btnCelebrate) {
                btnCelebrate.addEventListener('click', () => {
                    this.hideOverlays();
                    showScreen('home');
                });
            }

            const btnLeave = document.getElementById('btnLeaveWc');
            if (btnLeave) {
                btnLeave.addEventListener('click', () => {
                    this.hideOverlays();
                    showScreen('home');
                });
            }

            // Power-ups del dock del Mundial
            ['50_50', 'var', 'tiempo_extra', 'hinchada'].forEach(tipo => {
                const btn = document.querySelector(`#wcPowerupsDock [data-powerup="${tipo}"]`);
                if (btn) {
                    btn.addEventListener('click', () => usarComodin(tipo));
                }
            });
        }

        hideOverlays() {
            const elim = document.getElementById('worldCupEliminatedOverlay');
            if (elim) elim.classList.add('hidden');
            const champ = document.getElementById('worldCupChampionOverlay');
            if (champ) champ.classList.add('hidden');
        }

        async startTournament() {
            this.currentStageIdx = 0;
            this.totalScore = 0;
            this.hideOverlays();
            this.startStage(0);
        }

        updateBracketBar() {
            for (let i = 0; i < 5; i++) {
                const step = document.getElementById(`wcStep${i + 1}`);
                if (step) {
                    step.classList.remove('active', 'completed');
                    if (i < this.currentStageIdx) {
                        step.classList.add('completed');
                    } else if (i === this.currentStageIdx) {
                        step.classList.add('active');
                    }
                }
            }
        }

        async startStage(idx) {
            this.currentStageIdx = idx;
            this.updateBracketBar();

            const stage = this.stages[idx];
            const titleEl = document.getElementById('wcPhaseTitle');
            if (titleEl) titleEl.textContent = stage.title.toUpperCase();

            sound.playTransition();
            narrator.narrateCustom(`¡Comienza ${stage.title}! ¡A jugar por la camiseta!`);

            await iniciarPartida(userProfile.data.name || 'Bau', stage.count, true, 15, {
                modo: 'camino_al_mundial',
                fase_mundial: stage.id,
                dificultad: stage.diff,
                isWorldCup: true
            });
        }

        onStageFinished(puntos, total) {
            const stage = this.stages[this.currentStageIdx];
            const passed = puntos >= stage.req;

            if (!passed) {
                this.triggerElimination(stage);
            } else {
                this.totalScore += puntos;
                if (this.currentStageIdx === this.stages.length - 1) {
                    this.triggerChampion();
                } else {
                    sound.playFanfare();
                    narrator.narrateCustom(`¡Clasificamos a ${this.stages[this.currentStageIdx + 1].title}!`);
                    cyberCanvas.launchCelebration();
                    setTimeout(() => {
                        this.startStage(this.currentStageIdx + 1);
                    }, 2200);
                }
            }
        }

        triggerElimination(stage) {
            sound.playIncorrect();
            narrator.narrateCustom(`¡Eliminado en ${stage.title}! El fútbol siempre da revancha.`);
            const elim = document.getElementById('worldCupEliminatedOverlay');
            const title = document.getElementById('wcEliminatedPhaseTitle');
            if (title) title.textContent = `ELIMINADO EN ${stage.title.toUpperCase()}`;
            if (elim) elim.classList.remove('hidden');
        }

        triggerChampion() {
            sound.playFanfare();
            narrator.narrateCustom("¡ARGENTINA CAMPEÓN DEL MUNDO! ¡SOMOS CAMPEONES OTRA VEZ!", 1.3, 1.15);
            userProfile.addXp(300, 'Campeón Mundial');
            userProfile.unlockAchievement('legend');

            const champ = document.getElementById('worldCupChampionOverlay');
            if (champ) champ.classList.remove('hidden');

            cyberCanvas.launchCelebration();
        }
    }

    // =========================================================================
    // 6.8. MODO PENALES 1 VS 1 EN LA MISMA PANTALLA
    // =========================================================================
    class PenaltiesEngine {
        constructor() {
            this.maxRounds = 5;
            this.currentRound = 0;
            this.currentTurn = 1;
            this.scores = { 1: 0, 2: 0 };
            this.beads = { 1: [], 2: [] };
            this.isSuddenDeath = false;
            this.isAnswering = false;
            this.timerInterval = null;

            this.banterQuotes = [
                "¡A tu casa a tomar la chocolatada!",
                "¡Te paseé en el potrero y en los penales!",
                "¡Andá a buscarla al ángulo!",
                "¡No te olvides de pagar la coca!",
                "¡El arquero todavía la está buscando en el córner!",
                "¡La próxima traé un mapa para encontrar el arco!",
                "¡Sos crack, pero hoy mandó la cátedra!"
            ];

            this.setupListeners();
        }

        setupListeners() {
            const btnRematch = document.getElementById('btnPenaltiesRematch');
            if (btnRematch) {
                btnRematch.addEventListener('click', () => {
                    const overlay = document.getElementById('penaltiesPodiumOverlay');
                    if (overlay) overlay.classList.add('hidden');
                    this.startShootout();
                });
            }

            const btnExit = document.getElementById('btnPenaltiesExit');
            if (btnExit) {
                btnExit.addEventListener('click', () => {
                    const overlay = document.getElementById('penaltiesPodiumOverlay');
                    if (overlay) overlay.classList.add('hidden');
                    showScreen('home');
                });
            }
        }

        async startShootout() {
            this.currentRound = 0;
            this.currentTurn = 1;
            this.scores = { 1: 0, 2: 0 };
            this.beads = { 1: [], 2: [] };
            this.isSuddenDeath = false;

            const name1 = userProfile.data.name || 'JUGADOR 1';
            const name2 = 'RIVAL';

            const s1Name = document.getElementById('penaltiesScoreName1');
            const s2Name = document.getElementById('penaltiesScoreName2');
            if (s1Name) s1Name.textContent = name1.toUpperCase();
            if (s2Name) s2Name.textContent = name2.toUpperCase();

            document.getElementById('penaltiesScoreVal1').textContent = '0';
            document.getElementById('penaltiesScoreVal2').textContent = '0';

            this.resetBeadsDOM();

            const overlay = document.getElementById('penaltiesPodiumOverlay');
            if (overlay) overlay.classList.add('hidden');

            try {
                const res = await fetch('/api/game/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: 'Penales', cantidad: 20, con_tiempo: true, segundos: 10 })
                });
                const data = await res.json();
                if (data.success) {
                    state.sessionId = data.session_id;
                    showScreen('penalties');
                    this.nextPenaltyTurn(data.pregunta);
                }
            } catch(e) {
                console.error('Error iniciando penales:', e);
            }
        }

        resetBeadsDOM() {
            ['penaltiesBeads1', 'penaltiesBeads2'].forEach(id => {
                const wrap = document.getElementById(id);
                if (wrap) {
                    wrap.innerHTML = '';
                    for (let i = 0; i < 5; i++) {
                        const b = document.createElement('span');
                        b.className = 'tv-bead bead-pending';
                        b.setAttribute('data-round', i);
                        wrap.appendChild(b);
                    }
                }
            });
        }

        nextPenaltyTurn(pregunta) {
            this.isAnswering = false;
            const turnBanner = document.getElementById('penaltyTurnBanner');
            const turnText = document.getElementById('penaltyTurnText');
            const pName = (this.currentTurn === 1) ? (userProfile.data.name || 'JUGADOR 1') : 'RIVAL';

            if (turnText) turnText.textContent = `¡PATEA ${pName.toUpperCase()}!`;
            if (turnBanner) turnBanner.className = `penalty-turn-banner turn-player-${this.currentTurn}`;

            const qText = document.getElementById('penaltyQuestionText');
            if (qText) qText.textContent = pregunta.pregunta;

            const grid = document.getElementById('penaltyOptionsGrid');
            if (grid) {
                grid.innerHTML = '';
                const keys = ['A', 'B', 'C', 'D'];
                pregunta.opciones.forEach((opc, idx) => {
                    const btn = document.createElement('button');
                    btn.className = 'option-btn';
                    btn.setAttribute('data-option', opc);
                    btn.innerHTML = `<span class="option-key">${keys[idx] || (idx + 1)}</span><span class="option-text">${escapeHtml(opc)}</span>`;
                    btn.onclick = () => {
                        if (!this.isAnswering) this.handlePenaltyAnswer(opc, btn);
                    };
                    grid.appendChild(btn);
                });
            }

            const feedback = document.getElementById('penaltyFeedbackBanner');
            if (feedback) feedback.classList.add('hidden');

            this.startPenaltyTimer();
        }

        startPenaltyTimer() {
            this.stopPenaltyTimer();
            let timeLeft = 10;
            const timerBadge = document.getElementById('penaltyTimerBadge');
            if (timerBadge) timerBadge.textContent = `⏱️ ${timeLeft}s`;

            this.timerInterval = setInterval(() => {
                timeLeft--;
                if (timerBadge) timerBadge.textContent = `⏱️ ${timeLeft}s`;
                if (timeLeft <= 0) {
                    this.stopPenaltyTimer();
                    this.handlePenaltyAnswer(null, null);
                }
            }, 1000);
        }

        stopPenaltyTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }

        async handlePenaltyAnswer(opcion, btn) {
            if (this.isAnswering) return;
            this.isAnswering = true;
            this.stopPenaltyTimer();

            try {
                const res = await fetch('/api/game/answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: state.sessionId,
                        opcion: opcion,
                        tiempo_empleado: 2.5
                    })
                });

                const data = await res.json();
                const acerto = data.success && data.resultado && data.resultado.acerto;

                this.recordPenaltyOutcome(acerto);

                const feedback = document.getElementById('penaltyFeedbackBanner');
                const title = document.getElementById('penaltyFeedbackTitle');
                const desc = document.getElementById('penaltyFeedbackDesc');
                const icon = document.getElementById('penaltyFeedbackIcon');

                if (acerto) {
                    sound.playNetSwish();
                    sound.playCrowdGoalRoar();
                    narrator.narratePenaltyResult(true);
                    if (icon) icon.textContent = '⚽';
                    if (title) title.textContent = '¡GOOOOOOOOOL!';
                    if (desc) desc.textContent = '¡La clavó al ángulo, inatajable!';
                    if (btn) btn.classList.add('opt-correct');
                } else {
                    sound.playIncorrect();
                    narrator.narratePenaltyResult(false);
                    if (icon) icon.textContent = '🧤';
                    if (title) title.textContent = '¡ATAJÓ EL ARQUERO!';
                    if (desc) desc.textContent = '¡Voló de palo a palo para taparla!';
                    if (btn) btn.classList.add('opt-wrong');
                }

                if (feedback) feedback.classList.remove('hidden');

                const btnNext = document.getElementById('btnPenaltyNextTurn');
                if (btnNext) {
                    btnNext.onclick = async () => {
                        feedback.classList.add('hidden');
                        const finished = this.checkShootoutFinished();
                        if (finished) {
                            this.finishShootout();
                        } else {
                            const nextRes = await fetch('/api/game/next', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ session_id: state.sessionId })
                            });
                            const nextData = await nextRes.json();
                            if (nextData.success && nextData.avance && nextData.avance.pregunta) {
                                this.nextPenaltyTurn(nextData.avance.pregunta);
                            }
                        }
                    };
                }
            } catch(e) {
                console.error('Error registrando penal:', e);
            }
        }

        recordPenaltyOutcome(isGoal) {
            const player = this.currentTurn;
            if (isGoal) {
                this.scores[player]++;
                const scoreVal = document.getElementById(`penaltiesScoreVal${player}`);
                if (scoreVal) scoreVal.textContent = this.scores[player];
            }

            this.beads[player].push(isGoal);

            const beadsWrap = document.getElementById(`penaltiesBeads${player}`);
            if (beadsWrap) {
                const beadIndex = this.beads[player].length - 1;
                let bead = beadsWrap.children[beadIndex];
                if (!bead) {
                    bead = document.createElement('span');
                    beadsWrap.appendChild(bead);
                }
                bead.className = `tv-bead ${isGoal ? 'bead-goal' : 'bead-miss'}`;
            }

            if (this.currentTurn === 1) {
                this.currentTurn = 2;
            } else {
                this.currentTurn = 1;
                this.currentRound++;
            }
        }

        checkShootoutFinished() {
            const shotsP1 = this.beads[1].length;
            const shotsP2 = this.beads[2].length;
            const s1 = this.scores[1];
            const s2 = this.scores[2];

            if (shotsP1 <= 5 && shotsP2 <= 5) {
                const remP1 = 5 - shotsP1;
                const remP2 = 5 - shotsP2;
                if (s1 > s2 + remP2) return true;
                if (s2 > s1 + remP1) return true;
                if (shotsP1 === 5 && shotsP2 === 5) {
                    if (s1 !== s2) return true;
                    this.isSuddenDeath = true;
                    sound.playFanfare();
                    narrator.narrateCustom("¡Empate en los 5 penales! ¡Vamos a muerte súbita tiro a tiro!");
                    return false;
                }
                return false;
            }

            if (shotsP1 === shotsP2 && shotsP1 > 5) {
                return (s1 !== s2);
            }

            return false;
        }

        finishShootout() {
            sound.playFanfare();
            const s1 = this.scores[1];
            const s2 = this.scores[2];
            const name1 = userProfile.data.name || 'JUGADOR 1';
            const name2 = 'RIVAL';
            const winner = (s1 > s2) ? name1 : name2;

            const overlay = document.getElementById('penaltiesPodiumOverlay');
            const winnerTitle = document.getElementById('penaltiesWinnerTitle');
            const banter = document.getElementById('penaltiesBanterText');
            const scoreDisplay = document.getElementById('penaltiesFinalScoreDisplay');

            if (winnerTitle) winnerTitle.textContent = `¡${winner.toUpperCase()} ES EL GANADOR!`;
            const randomBanter = this.banterQuotes[Math.floor(Math.random() * this.banterQuotes.length)];
            if (banter) banter.textContent = randomBanter;
            if (scoreDisplay) scoreDisplay.textContent = `${s1} - ${s2} en la tanda de penales`;

            narrator.narrateCustom(`¡Final del partido! ¡${winner} se lleva la gloria en los penales!`);
            if (s1 > s2) {
                userProfile.addXp(100, 'Duelo de Penales');
            }

            cyberCanvas.launchCelebration();
            if (overlay) overlay.classList.remove('hidden');
        }
    }

    const worldCupEngine = new WorldCupEngine();
    window.worldCupEngine = worldCupEngine;
    const penaltiesEngine = new PenaltiesEngine();
    window.penaltiesEngine = penaltiesEngine;

    // =========================================================================
    // 6.8. MOTOR DE TIKIDLE (WORDLE DE FÚTBOL)
    // =========================================================================
    class TikidleGame {
        constructor() {
            this.maxAttempts = 6;
            this.wordLength = 5;
            this.currentRow = 0;
            this.currentGuess = '';
            this.status = 'playing'; // 'playing', 'won', 'lost'
            this.todayInfo = null;
            this.guesses = [];
            this.evaluations = [];
            this.keyboardStatus = {};
            this.isSubmitting = false;

            this.stats = this.loadStats();
            this.setupUI();
        }

        loadStats() {
            try {
                const raw = localStorage.getItem('thetikitaka_tikidle_stats') || localStorage.getItem('quizpy_tikidle_stats');
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return {
                played: 0,
                won: 0,
                currentStreak: 0,
                maxStreak: 0,
                lastPlayedDate: '',
                distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 }
            };
        }

        saveStats() {
            try {
                const s = JSON.stringify(this.stats);
                localStorage.setItem('thetikitaka_tikidle_stats', s);
                localStorage.setItem('quizpy_tikidle_stats', s);
            } catch (e) {}
        }

        loadDailyState(fecha) {
            try {
                const raw = localStorage.getItem(`thetikitaka_tikidle_state_${fecha}`) || localStorage.getItem('thetikitaka_tikidle_state');
                if (raw) {
                    const st = JSON.parse(raw);
                    if (st.fecha === fecha) return st;
                }
            } catch (e) {}
            return null;
        }

        saveDailyState() {
            if (!this.todayInfo) return;
            const stateToSave = {
                fecha: this.todayInfo.fecha,
                dia_numero: this.todayInfo.dia_numero,
                guesses: this.guesses,
                evaluations: this.evaluations,
                currentRow: this.currentRow,
                status: this.status,
                palabra: this.status !== 'playing' ? (this.todayInfo.palabra || '') : '',
                definicion: this.status !== 'playing' ? (this.todayInfo.definicion || '') : ''
            };
            try {
                const s = JSON.stringify(stateToSave);
                localStorage.setItem(`thetikitaka_tikidle_state_${this.todayInfo.fecha}`, s);
                localStorage.setItem('thetikitaka_tikidle_state', s);
            } catch (e) {}
        }

        setupUI() {
            // Teclado virtual
            const kb = document.getElementById('tikidleKeyboard');
            if (kb) {
                kb.addEventListener('click', (e) => {
                    const btn = e.target.closest('.kb-key');
                    if (!btn) return;
                    const key = btn.getAttribute('data-key');
                    if (key) {
                        sound.playClick();
                        this.handleKeyPress(key);
                    }
                });
            }

            // Teclado físico
            window.addEventListener('keydown', (e) => {
                const screenEl = document.getElementById('screenTikidle');
                if (!screenEl || !screenEl.classList.contains('screen-active')) return;
                const modalEnd = document.getElementById('modalTikidleEnd');
                const modalHelp = document.getElementById('modalTikidleHelp');
                if (modalEnd && !modalEnd.classList.contains('hidden')) return;
                if (modalHelp && !modalHelp.classList.contains('hidden')) return;

                if (e.key === 'Backspace') {
                    e.preventDefault();
                    sound.playClick();
                    this.handleKeyPress('BACKSPACE');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    sound.playClick();
                    this.handleKeyPress('ENTER');
                } else {
                    const char = e.key.toUpperCase();
                    if (char === 'Ñ' || (char.length === 1 && char >= 'A' && char <= 'Z')) {
                        sound.playClick();
                        this.handleKeyPress(char);
                    }
                }
            });

            // Botón Compartir
            const btnShare = document.getElementById('btnTikidleShare');
            if (btnShare) {
                btnShare.addEventListener('click', () => {
                    this.shareResult();
                });
            }

            // Botones de Cabecera
            const btnStats = document.getElementById('btnTikidleStats');
            if (btnStats) {
                btnStats.addEventListener('click', () => {
                    this.renderStats();
                    openModal(modals.tikidleEnd);
                });
            }

            const btnHelp = document.getElementById('btnTikidleHelp');
            if (btnHelp) {
                btnHelp.addEventListener('click', () => {
                    openModal(modals.tikidleHelp);
                });
            }

            const btnExit = document.getElementById('btnTikidleExit');
            if (btnExit) {
                btnExit.addEventListener('click', () => {
                    sound.playClick();
                    showScreen('home');
                });
            }
        }

        async openGame() {
            showScreen('tikidle');
            this.currentGuess = '';
            this.isSubmitting = false;

            this.resetBoardUI();

            try {
                const res = await fetch('/api/tikidle/today');
                const data = await res.json();
                if (data.success) {
                    this.todayInfo = data;
                    const sub = document.getElementById('tikidleDateSubtitle');
                    if (sub) {
                        sub.textContent = `Desafío diario #${data.dia_numero} • ${data.fecha} • Intento 1 de 6`;
                    }
                    this.restoreOrInitDaily();
                }
            } catch (err) {
                console.warn('Error al cargar Tikidle del servidor:', err);
                const sub = document.getElementById('tikidleDateSubtitle');
                if (sub) sub.textContent = 'Palabra secreta de 5 letras • Intento 1 de 6';
            }
        }

        resetBoardUI() {
            const board = document.getElementById('tikidleBoard');
            if (!board) return;
            board.querySelectorAll('.tikidle-tile').forEach(tile => {
                tile.textContent = '';
                tile.className = 'tikidle-tile';
            });
            const kb = document.getElementById('tikidleKeyboard');
            if (kb) {
                kb.querySelectorAll('.kb-key').forEach(key => {
                    key.classList.remove('kb-correct', 'kb-present', 'kb-absent');
                });
            }
            this.keyboardStatus = {};
        }

        restoreOrInitDaily() {
            if (!this.todayInfo) return;
            const saved = this.loadDailyState(this.todayInfo.fecha);
            if (saved) {
                this.guesses = saved.guesses || [];
                this.evaluations = saved.evaluations || [];
                this.currentRow = saved.currentRow || 0;
                this.status = saved.status || 'playing';
                if (saved.palabra) this.todayInfo.palabra = saved.palabra;
                if (saved.definicion) this.todayInfo.definicion = saved.definicion;

                for (let r = 0; r < this.guesses.length; r++) {
                    const word = this.guesses[r];
                    const evals = this.evaluations[r] || [];
                    const rowEl = document.querySelector(`.tikidle-row[data-row="${r}"]`);
                    if (!rowEl) continue;
                    const tiles = rowEl.querySelectorAll('.tikidle-tile');
                    for (let c = 0; c < 5; c++) {
                        const tile = tiles[c];
                        if (tile) {
                            tile.textContent = word[c] || '';
                            const colorClass = `tile-${evals[c] || 'absent'}`;
                            tile.classList.add(colorClass);
                            this.updateKeyboardKey(word[c], evals[c]);
                        }
                    }
                }

                this.updateAttemptIndicator();

                if (this.status !== 'playing') {
                    setTimeout(() => {
                        this.showEndModal();
                    }, 600);
                }
            } else {
                this.guesses = [];
                this.evaluations = [];
                this.currentRow = 0;
                this.status = 'playing';
                this.updateAttemptIndicator();
            }
        }

        updateAttemptIndicator() {
            const num = document.getElementById('tikidleAttemptNum');
            if (num) {
                num.textContent = Math.min(this.currentRow + 1, 6);
            }
        }

        handleKeyPress(key) {
            if (this.status !== 'playing' || this.isSubmitting) return;

            if (key === 'BACKSPACE') {
                if (this.currentGuess.length > 0) {
                    this.currentGuess = this.currentGuess.slice(0, -1);
                    this.renderCurrentRow();
                }
            } else if (key === 'ENTER') {
                this.submitGuess();
            } else {
                if (this.currentGuess.length < this.wordLength) {
                    this.currentGuess += key;
                    this.renderCurrentRow();
                }
            }
        }

        renderCurrentRow() {
            const rowEl = document.querySelector(`.tikidle-row[data-row="${this.currentRow}"]`);
            if (!rowEl) return;
            const tiles = rowEl.querySelectorAll('.tikidle-tile');
            for (let i = 0; i < this.wordLength; i++) {
                const char = this.currentGuess[i] || '';
                tiles[i].textContent = char;
                if (char) {
                    tiles[i].classList.add('tile-filled');
                } else {
                    tiles[i].classList.remove('tile-filled');
                }
            }
        }

        showToast(msg) {
            const toast = document.getElementById('tikidleToast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.remove('hidden');
            clearTimeout(this.toastTimeout);
            this.toastTimeout = setTimeout(() => {
                toast.classList.add('hidden');
            }, 1800);
        }

        shakeCurrentRow() {
            const rowEl = document.querySelector(`.tikidle-row[data-row="${this.currentRow}"]`);
            if (rowEl) {
                rowEl.classList.remove('row-shake');
                void rowEl.offsetWidth;
                rowEl.classList.add('row-shake');
                setTimeout(() => rowEl.classList.remove('row-shake'), 450);
            }
        }

        async submitGuess() {
            if (this.currentGuess.length < this.wordLength) {
                this.showToast('¡Faltan letras!');
                this.shakeCurrentRow();
                sound.playIncorrect();
                return;
            }

            this.isSubmitting = true;

            try {
                const res = await fetch('/api/tikidle/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        guess: this.currentGuess,
                        attempt: this.currentRow + 1
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    this.showToast(data.error || 'Palabra no válida');
                    this.shakeCurrentRow();
                    sound.playIncorrect();
                    this.isSubmitting = false;
                    return;
                }

                const wordSubmitted = this.currentGuess;
                const evalResult = data.evaluation;
                this.guesses.push(wordSubmitted);
                this.evaluations.push(evalResult);

                const rowEl = document.querySelector(`.tikidle-row[data-row="${this.currentRow}"]`);
                const tiles = rowEl.querySelectorAll('.tikidle-tile');

                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        const tile = tiles[i];
                        tile.classList.add('tile-flip');
                        setTimeout(() => {
                            tile.classList.remove('tile-filled');
                            tile.classList.add(`tile-${evalResult[i]}`);
                            this.updateKeyboardKey(wordSubmitted[i], evalResult[i]);
                            sound.playClick();
                        }, 250);
                    }, i * 200);
                }

                setTimeout(() => {
                    this.isSubmitting = false;

                    if (data.won) {
                        this.handleGameEnd(true, data);
                    } else if (data.lost) {
                        this.handleGameEnd(false, data);
                    } else {
                        this.currentRow++;
                        this.currentGuess = '';
                        this.updateAttemptIndicator();
                        this.saveDailyState();
                    }
                }, 1400);

            } catch (err) {
                console.error('Error al verificar palabra:', err);
                this.showToast('Error de conexión');
                this.isSubmitting = false;
            }
        }

        updateKeyboardKey(char, evalState) {
            const keyEl = document.querySelector(`.kb-key[data-key="${char}"]`);
            if (!keyEl) return;

            const priority = { 'correct': 3, 'present': 2, 'absent': 1 };
            const currentP = priority[this.keyboardStatus[char]] || 0;
            const newP = priority[evalState] || 0;

            if (newP > currentP) {
                this.keyboardStatus[char] = evalState;
                keyEl.classList.remove('kb-correct', 'kb-present', 'kb-absent');
                keyEl.classList.add(`kb-${evalState}`);
            }
        }

        handleGameEnd(won, data) {
            this.status = won ? 'won' : 'lost';
            if (data.palabra) this.todayInfo.palabra = data.palabra;
            if (data.definicion) this.todayInfo.definicion = data.definicion;

            this.stats.played++;
            if (won) {
                this.stats.won++;
                this.stats.currentStreak++;
                if (this.stats.currentStreak > this.stats.maxStreak) {
                    this.stats.maxStreak = this.stats.currentStreak;
                }
                const attKey = String(this.currentRow + 1);
                if (this.stats.distribution[attKey] !== undefined) {
                    this.stats.distribution[attKey]++;
                }
                userProfile.addXp(150, 'Tikidle Diario');
                sound.playFanfare();
                narrator.narrateGoal(3);
                cyberCanvas.launchCelebration();
            } else {
                this.stats.currentStreak = 0;
                sound.playIncorrect();
                narrator.narrateMiss();
            }
            this.stats.lastPlayedDate = this.todayInfo.fecha;

            this.saveStats();
            this.saveDailyState();

            setTimeout(() => {
                this.showEndModal();
            }, 800);
        }

        showEndModal() {
            const titleEl = document.getElementById('tikidleEndTitle');
            const wordEl = document.getElementById('tikidleEndWord');
            const descEl = document.getElementById('tikidleEndDesc');

            const isWin = (this.status === 'won');
            if (titleEl) {
                titleEl.textContent = isWin ? '🏆 ¡GOLAZO! ADIVINASTE' : '💔 SE FUE AFUERA';
            }
            if (wordEl) {
                wordEl.textContent = this.todayInfo ? (this.todayInfo.palabra || '') : '';
                wordEl.style.color = isWin ? '#00ff88' : '#ff0055';
            }
            if (descEl) {
                descEl.textContent = this.todayInfo ? (this.todayInfo.definicion || 'Palabra de fútbol del día.') : '';
            }

            this.renderStats();
            openModal(modals.tikidleEnd);
        }

        renderStats() {
            const p = document.getElementById('tikidleStatPlayed');
            const w = document.getElementById('tikidleStatWinPct');
            const s = document.getElementById('tikidleStatStreak');
            const m = document.getElementById('tikidleStatMaxStreak');

            if (p) p.textContent = this.stats.played;
            if (w) {
                const pct = this.stats.played > 0 ? Math.round((this.stats.won / this.stats.played) * 100) : 0;
                w.textContent = `${pct}%`;
            }
            if (s) s.textContent = this.stats.currentStreak;
            if (m) m.textContent = this.stats.maxStreak;

            const barsContainer = document.getElementById('tikidleDistBars');
            if (barsContainer) {
                barsContainer.innerHTML = '';
                const maxVal = Math.max(1, ...Object.values(this.stats.distribution));
                const winningRow = (this.status === 'won') ? (this.currentRow + 1) : null;

                for (let i = 1; i <= 6; i++) {
                    const count = this.stats.distribution[String(i)] || 0;
                    const pctWidth = Math.max(8, Math.round((count / maxVal) * 100));
                    const isHighlight = (winningRow === i);

                    const rowDiv = document.createElement('div');
                    rowDiv.className = 'dist-row';
                    rowDiv.innerHTML = `
                        <span class="dist-num">${i}</span>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill ${isHighlight ? 'fill-highlight' : ''}" style="width: ${pctWidth}%;">
                                <span>${count}</span>
                            </div>
                        </div>
                    `;
                    barsContainer.appendChild(rowDiv);
                }
            }
        }

        generateShareText() {
            const fecha = this.todayInfo ? this.todayInfo.fecha : 'Hoy';
            const attemptsStr = (this.status === 'won') ? `${this.guesses.length}/6` : 'X/6';

            let grid = '';
            for (let r = 0; r < this.evaluations.length; r++) {
                const ev = this.evaluations[r];
                for (let c = 0; c < ev.length; c++) {
                    if (ev[c] === 'correct') grid += '🟩';
                    else if (ev[c] === 'present') grid += '🟨';
                    else grid += '⬛';
                }
                grid += '\n';
            }

            return `Tikidle del ${fecha} ${attemptsStr}\n${grid}Jugalo en The Tiki Taka`;
        }

        shareResult() {
            sound.playClick();
            const text = this.generateShareText();
            const copiedMsg = document.getElementById('tikidleShareCopied');

            const showFeedback = () => {
                if (copiedMsg) {
                    copiedMsg.classList.remove('hidden');
                    setTimeout(() => copiedMsg.classList.add('hidden'), 2500);
                }
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(showFeedback).catch(() => {
                    this.fallbackCopy(text);
                    showFeedback();
                });
            } else {
                this.fallbackCopy(text);
                showFeedback();
            }
        }

        fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand('copy');
            } catch (e) {}
            document.body.removeChild(ta);
        }
    }

    const tikidleGame = new TikidleGame();
    window.tikidleGame = tikidleGame;

    // =========================================================================
    // 7. EVENTOS Y BINDINGS DE USUARIO
    // =========================================================================
    function setupEventListeners() {
        // Pantalla de Inicio y Perfil
        const inputHomeName = document.getElementById('homePlayerName');
        const btnPlayQuick = document.getElementById('btnPlayQuick');
        const btnGoConfig = document.getElementById('btnGoConfig');
        const btnGoRecords = document.getElementById('btnGoRecords');

        if (inputHomeName) {
            inputHomeName.value = userProfile.data.name;
            inputHomeName.addEventListener('input', (e) => {
                userProfile.setName(e.target.value);
            });
        }

        if (btnPlayQuick) {
            btnPlayQuick.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = userProfile.data.name || 'Bau';
                iniciarPartida(name, state.config.questionCount, state.config.timerActive, state.config.timerSeconds);
            });
        }

        if (btnGoConfig) {
            btnGoConfig.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = userProfile.data.name || 'Bau';
                document.getElementById('cfgPlayerName').value = name;
                showScreen('setup');
            });
        }

        if (btnGoRecords) {
            btnGoRecords.addEventListener('click', (e) => {
                e.stopPropagation();
                cargarTablaRecords();
                showScreen('records');
            });
        }

        // Pantalla de Perfil de Jugador
        const btnProfileBack = document.getElementById('btnProfileBack');
        if (btnProfileBack) {
            btnProfileBack.addEventListener('click', () => {
                sound.playClick();
                showScreen('home');
            });
        }

        const btnProfilePlay = document.getElementById('btnProfilePlay');
        if (btnProfilePlay) {
            btnProfilePlay.addEventListener('click', () => {
                iniciarPartida(userProfile.data.name, state.config.questionCount, state.config.timerActive, state.config.timerSeconds);
            });
        }

        const btnProfileQuickPlay = document.getElementById('btnProfileQuickPlay');
        if (btnProfileQuickPlay) {
            btnProfileQuickPlay.addEventListener('click', () => {
                iniciarPartida(userProfile.data.name, state.config.questionCount, state.config.timerActive, state.config.timerSeconds);
            });
        }

        const profNameInput = document.getElementById('profNameInput');
        const btnSaveProfName = document.getElementById('btnSaveProfName');
        if (btnSaveProfName && profNameInput) {
            btnSaveProfName.addEventListener('click', () => {
                sound.playClick();
                userProfile.setName(profNameInput.value);
                alert('¡Apodo guardado correctamente!');
            });
        }

        // Controladores de Modales para Nuevos Modos
        const btnStartWorldCupModal = document.getElementById('btnStartWorldCupModal');
        if (btnStartWorldCupModal) {
            btnStartWorldCupModal.addEventListener('click', () => {
                closeModal(modals.worldcup);
                worldCupEngine.startTournament();
            });
        }

        const btnStartPenaltiesModal = document.getElementById('btnStartPenaltiesModal');
        if (btnStartPenaltiesModal) {
            btnStartPenaltiesModal.addEventListener('click', () => {
                closeModal(modals.penalties);
                penaltiesEngine.startShootout();
            });
        }

        const btnStartDailyModal = document.getElementById('btnStartDailyModal');
        if (btnStartDailyModal) {
            btnStartDailyModal.addEventListener('click', () => {
                closeModal(modals.daily);
                iniciarPartida(userProfile.data.name, 5, state.config.timerActive, state.config.timerSeconds, { modo: 'desafio_diario' });
            });
        }

        // Barra de Comodines en Partida Regular
        ['50_50', 'var', 'tiempo_extra', 'hinchada'].forEach(tipo => {
            const btn = document.querySelector(`#powerupsDock [data-powerup="${tipo}"]`);
            if (btn) {
                btn.addEventListener('click', () => usarComodin(tipo));
            }
        });

        const dailyDateTxt = document.getElementById('dailyChallengeDateText');
        if (dailyDateTxt) {
            const today = new Date();
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            dailyDateTxt.textContent = `DESAFÍO DEL DÍA — ${today.toLocaleDateString('es-AR', options).toUpperCase()}`;
        }

        // Inicializar Navegador del Menú de Tarjetas
        const menuNav = new MenuNavigator('menuCardsGrid', (action) => {
            const playerName = userProfile.data.name || 'Bau';
            switch (action) {
                case 'worldcup':
                    openModal(modals.worldcup);
                    break;
                case 'penalties':
                    openModal(modals.penalties);
                    break;
                case 'quick':
                    iniciarPartida(playerName, state.config.questionCount, state.config.timerActive, state.config.timerSeconds);
                    break;
                case 'daily':
                    openModal(modals.daily);
                    break;
                case 'tikidle':
                    tikidleGame.openGame();
                    break;
                case 'profile':
                    userProfile.renderProfileScreen();
                    showScreen('profile');
                    break;
                case 'records':
                    cargarTablaRecords();
                    showScreen('records');
                    break;
                case 'config':
                    showScreen('setup');
                    break;
            }
        });
        window.menuNav = menuNav;

        // Pantalla de Configuración
        const sliderQ = document.getElementById('cfgQuestionCount');
        const sliderVal = document.getElementById('cfgQuestionCountVal');
        sliderQ.addEventListener('input', (e) => {
            sliderVal.textContent = e.target.value;
            state.config.questionCount = parseInt(e.target.value);
        });

        const timerSwitch = document.getElementById('cfgTimerActive');
        const timerBox = document.getElementById('cfgTimerOptions');
        timerSwitch.addEventListener('change', (e) => {
            state.config.timerActive = e.target.checked;
            if (e.target.checked) {
                timerBox.classList.remove('hidden');
            } else {
                timerBox.classList.add('hidden');
            }
        });

        // Botones de segundos por pregunta
        const timerPills = document.querySelectorAll('.btn-pill-timer');
        timerPills.forEach(pill => {
            pill.addEventListener('click', () => {
                sound.playClick();
                timerPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                state.config.timerSeconds = parseInt(pill.getAttribute('data-sec'));
            });
        });

        document.getElementById('cfgSoundToggle').addEventListener('change', (e) => {
            sound.enabled = e.target.checked;
            actualizarIconoSonido();
        });

        document.getElementById('cfgAnimToggle').addEventListener('change', (e) => {
            state.config.animations = e.target.checked;
            cyberCanvas.enabled = e.target.checked;
            if (!e.target.checked) cyberCanvas.stop();
            else cyberCanvas.start();
        });

        const introToggle = document.getElementById('cfgIntroToggle');
        if (introToggle) {
            introToggle.checked = (localStorage.getItem('thetikitaka_skip_intro') !== 'true' && localStorage.getItem('quizpy_skip_intro') !== 'true');
            introToggle.addEventListener('change', (e) => {
                const val = e.target.checked ? 'false' : 'true';
                localStorage.setItem('thetikitaka_skip_intro', val);
                localStorage.setItem('quizpy_skip_intro', val);
            });
        }

        document.getElementById('btnCancelConfig').addEventListener('click', () => {
            sound.playClick();
            showScreen('home');
        });

        document.getElementById('btnStartGame').addEventListener('click', () => {
            const name = document.getElementById('cfgPlayerName').value.trim() || userProfile.data.name || 'Bau';
            iniciarPartida(name, state.config.questionCount, state.config.timerActive, state.config.timerSeconds);
        });

        // Controles de Partida
        document.getElementById('btnLeaveGame').addEventListener('click', () => {
            openModal(modals.leave);
        });

        document.getElementById('btnCancelLeave').addEventListener('click', () => {
            closeModal(modals.leave);
        });

        document.getElementById('btnConfirmLeave').addEventListener('click', () => {
            closeModal(modals.leave);
            detenerTemporizador();
            showScreen('home');
        });

        // Pantalla de Resultados
        document.getElementById('btnPlayAgain').addEventListener('click', () => {
            iniciarPartida(state.playerName, state.config.questionCount, state.config.timerActive, state.config.timerSeconds);
        });

        document.getElementById('btnReviewAnswers').addEventListener('click', mostrarRepaso);

        document.getElementById('btnViewLeaderboard').addEventListener('click', () => {
            cargarTablaRecords();
            showScreen('records');
        });

        document.getElementById('btnReturnHome').addEventListener('click', () => {
            sound.playClick();
            showScreen('home');
        });

        // Pantalla de Repaso
        document.getElementById('btnBackToResults').addEventListener('click', () => {
            sound.playClick();
            showScreen('results');
        });

        // Pantalla de Récords
        document.getElementById('btnRefreshRecords').addEventListener('click', cargarTablaRecords);
        document.getElementById('btnRecordsBack').addEventListener('click', () => {
            sound.playClick();
            showScreen('home');
        });
        document.getElementById('btnRecordsPlay').addEventListener('click', () => {
            showScreen('setup');
        });

        // HUD Superior
        const btnNarrator = document.getElementById('btnToggleNarrator');
        if (btnNarrator) {
            btnNarrator.addEventListener('click', () => {
                narrator.enabled = !narrator.enabled;
                const icon = document.getElementById('narratorIcon');
                if (icon) icon.textContent = narrator.enabled ? '🎙️' : '🔇';
                sound.playClick();
            });
        }

        const btnSound = document.getElementById('btnToggleSound');
        btnSound.addEventListener('click', () => {
            sound.enabled = !sound.enabled;
            actualizarIconoSonido();
            document.getElementById('cfgSoundToggle').checked = sound.enabled;
        });

        document.getElementById('btnOpenConfig').addEventListener('click', () => {
            showScreen('setup');
        });

        document.getElementById('btnOpenHelp').addEventListener('click', () => {
            openModal(modals.help);
        });

        // Cerrar modales con [data-close]
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-close');
                closeModal(document.getElementById(targetId));
            });
        });

        // Atajos de Teclado
        window.addEventListener('keydown', (e) => {
            // Si hay un modal abierto y presiona Escape, cerrarlo
            if (e.key === 'Escape') {
                Object.values(modals).forEach(m => closeModal(m));
                return;
            }

            // Si está escribiendo en un input, no interceptar teclas
            if (e.target.tagName === 'INPUT') return;

            // En la pantalla del Menú Principal: Navegación de tarjetas con flechas y Enter
            if (screens.home && screens.home.classList.contains('screen-active')) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (window.menuNav) window.menuNav.move('right');
                    return;
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (window.menuNav) window.menuNav.move('left');
                    return;
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (window.menuNav) window.menuNav.move('down');
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (window.menuNav) window.menuNav.move('up');
                    return;
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (window.menuNav) window.menuNav.activateCurrent();
                    return;
                }
            }

            // En la pantalla de juego o arena del mundial
            const inGame = screens.game && screens.game.classList.contains('screen-active');
            const inWc = screens.worldcup && screens.worldcup.classList.contains('screen-active');
            if (inGame || inWc) {
                const prefix = inWc ? '#wc' : '#';
                const keyMap = {
                    '1': 0, 'a': 0, 'A': 0,
                    '2': 1, 'b': 1, 'B': 1,
                    '3': 2, 'c': 2, 'C': 2,
                    '4': 3, 'd': 3, 'D': 3
                };

                if (e.key in keyMap && !state.isAnswering) {
                    const idx = keyMap[e.key];
                    const tfGrid = document.querySelector(inWc ? '#wcTrueFalseGrid' : '#trueFalseGrid');
                    if (tfGrid && !tfGrid.classList.contains('hidden')) {
                        const tfBtns = tfGrid.querySelectorAll('.tf-btn');
                        if (tfBtns[idx]) tfBtns[idx].click();
                        return;
                    }

                    const optSelector = inWc ? '#wcOptionsGrid .option-btn, #wcCluesOptionsGrid .option-btn' : '#optionsGrid .option-btn, #cluesOptionsGrid .option-btn';
                    const btns = document.querySelectorAll(optSelector);
                    if (btns[idx]) {
                        btns[idx].click();
                    }
                } else if ((e.key === 'v' || e.key === 'V') && !state.isAnswering) {
                    const btnV = document.querySelector(`${prefix === '#wc' ? '#wcTrueFalseGrid' : '#trueFalseGrid'} .btn-tf-true`);
                    if (btnV && !btnV.closest('.hidden')) btnV.click();
                } else if ((e.key === 'f' || e.key === 'F') && !state.isAnswering) {
                    const btnF = document.querySelector(`${prefix === '#wc' ? '#wcTrueFalseGrid' : '#trueFalseGrid'} .btn-tf-false`);
                    if (btnF && !btnF.closest('.hidden')) btnF.click();
                } else if ((e.key === 'Enter' || e.key === ' ') && state.isAnswering) {
                    const nextId = inWc ? 'btnWcNextQuestion' : 'btnNextQuestion';
                    const fbId = inWc ? 'wcFeedbackBanner' : 'feedbackBanner';
                    const btnNext = document.getElementById(nextId);
                    const fb = document.getElementById(fbId);
                    if (btnNext && fb && !fb.classList.contains('hidden')) {
                        btnNext.click();
                    }
                }
            }
        });
    }

    function actualizarIconoSonido() {
        const icon = document.getElementById('soundIcon');
        icon.textContent = sound.enabled ? '🔊' : '🔇';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Registro de Service Worker para PWA y soporte Offline
    function initPWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then((reg) => {
                        console.log('THE TIKI TAKA Service Worker activo (Scope:', reg.scope, ')');
                    })
                    .catch((err) => {
                        console.warn('Error registrando Service Worker:', err);
                    });
            });
        }

        // Manejo de evento para instalar PWA
        let deferredPrompt = null;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const btnInstall = document.getElementById('btnInstallPwa');
            if (btnInstall) {
                btnInstall.classList.remove('hidden');
                btnInstall.onclick = async () => {
                    btnInstall.classList.add('hidden');
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        console.log('Respuesta de instalación PWA:', outcome);
                        deferredPrompt = null;
                    }
                };
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('¡THE TIKI TAKA fue instalado exitosamente como aplicación!');
            const btnInstall = document.getElementById('btnInstallPwa');
            if (btnInstall) btnInstall.classList.add('hidden');
        });
    }

    // Inicialización al cargar la página
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        cargarEstadisticasInicio();
        if (window.userProfile) window.userProfile.updateHud();
        initPWA();
        window.cinematicIntro = new CinematicIntro();
    });

})();
