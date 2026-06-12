let audioCtx, analyser, globalGain, masterWaveShaper, masterBitCrusher, masterCompressor;
let activeDrum = null;
let currentCrushVal = 0; 

// DOM Elemanları
const drumButtons = document.querySelectorAll('.drum-type-btn');
const emptyState = document.getElementById('emptyState');
const paramControls = document.getElementById('paramControls');
const moduleMetaActions = document.getElementById('moduleMetaActions'); 
const triggerArea = document.getElementById('triggerArea');
const triggerBtn = document.getElementById('triggerBtn');
const exportBtn = document.getElementById('exportBtn');
const globalResetBtn = document.getElementById('globalResetBtn');
const randomizeBtn = document.getElementById('randomizeBtn'); 
const vizPanel = document.getElementById('vizPanel');
const signalAlert = document.getElementById('signalAlert');
const lunarLog = document.getElementById('lunarLog');
const vuL = document.getElementById('vuL');
const vuR = document.getElementById('vuR');

// Master FX DOM
const masterDriveSlider = document.getElementById('masterDrive');
const masterCrushSlider = document.getElementById('masterCrush');
const masterCompSlider = document.getElementById('masterComp');
const vMasterDrive = document.getElementById('v-masterDrive');
const vMasterCrush = document.getElementById('v-masterCrush');
const vMasterComp = document.getElementById('v-masterComp');

// Dinamik Parametre Seçicileri
const paramRows = document.querySelectorAll('.parameter-matrix .param-row');

const canvas = document.getElementById('analyzerCanvas');
const ctx = canvas.getContext('2d');

let gridOffset = 0;

// --- DİNAMİK SEKMEYE [LS] LOGOSU YAZMA MOTORU ---
function generateFontalFavicon() {
    const favCanvas = document.createElement('canvas');
    favCanvas.width = 32;
    favCanvas.height = 32;
    const favCtx = favCanvas.getContext('2d');
    
    favCtx.fillStyle = '#000000';
    favCtx.fillRect(0, 0, 32, 32);
    favCtx.fillStyle = '#ffffff';
    favCtx.font = 'bold 14px "Doto", monospace';
    favCtx.textAlign = 'center';
    favCtx.textBaseline = 'middle';
    favCtx.fillText('[LS]', 16, 16);
    
    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = favCanvas.toDataURL();
    document.getElementsByTagName('head')[0].appendChild(link);
}
window.addEventListener('DOMContentLoaded', generateFontalFavicon);

const drumSpecs = {
    '808': {
        p1: ['START_PITCH', 80, 260, 130, 'Hz'], p2: ['END_PITCH', 30, 70, 48, 'Hz'],
        p3: ['DECAY_TIME', 0.3, 2.5, 1.2, 's'], p4: ['SATURATION', 0, 100, 35, '%'],
        p5: ['PUNCH_TIME', 10, 80, 35, 'ms'], p6: ['LOW_PASS', 150, 1000, 400, 'Hz']
    },
    'kick': {
        p1: ['PUNCH_FREQ', 160, 350, 200, 'Hz'], p2: ['BODY_FREQ', 45, 85, 55, 'Hz'],
        p3: ['KICK_DECAY', 0.04, 0.25, 0.1, 's'], p4: ['HARD_CLIP', 0, 100, 50, '%'],
        p5: ['ATTACK_SNAP', 1, 30, 8, 'ms'], p6: ['LOW_FILTER', 200, 1500, 800, 'Hz']
    },
    'snare': { 
        p1: ['GLO_PITCH', 160, 320, 225, 'Hz'], p2: ['NOISE_MIX', 10, 90, 50, '%'],
        p3: ['CRISP_DECAY', 0.05, 0.4, 0.16, 's'], p4: ['BODY_DECAY', 0.03, 0.25, 0.07, 's'],
        p5: ['METALLIC_HP', 1000, 4000, 1500, 'Hz'], p6: ['TRANSIENT', 10, 100, 75, '%']
    },
    'clap': {
        p1: ['BAND_PASS', 900, 2200, 1300, 'Hz'], p2: ['MICRO_DELAY', 4, 25, 12, 'ms'],
        p3: ['MAIN_DECAY', 0.06, 0.6, 0.22, 's'], p4: ['RE_TRIGGERS', 2, 7, 4, 'X'],
        p5: ['SPREAD_WIDTH', 1, 10, 4, 'G'], p6: ['HIGH_SHELF', 2000, 8000, 4000, 'Hz']
    },
    'closed_hat': {
        p1: ['HIGH_PASS', 6000, 14000, 9000, 'Hz'], p2: ['HAT_DECAY', 0.01, 0.15, 0.04, 's'],
        p3: ['RESONANCE', 1, 12, 2, 'Q'], p4: ['VELOCITY', 40, 100, 85, '%'],
        p5: ['PITCH_MOD', -500, 500, 0, 'ct'], p6: ['DRIVE', 0, 50, 5, '%']
    },
    'open_hat': {
        p1: ['HIGH_PASS', 5000, 13000, 8000, 'Hz'], p2: ['OPEN_DECAY', 0.2, 1.2, 0.5, 's'],
        p3: ['RESONANCE', 1, 10, 1, 'Q'], p4: ['SUSTAIN_LEVEL', 10, 90, 50, '%'],
        p5: ['DRIVE_GAIN', 0, 70, 15, '%'], p6: ['RING_MOD', 0, 1000, 0, 'Hz']
    },
    'sub_bass': {
        p1: ['SUB_FREQ', 32, 85, 44, 'Hz'], p2: ['GLIDE_START', 0, 120, 0, 'Hz'],
        p3: ['GLIDE_TIME', 10, 200, 40, 'ms'], p4: ['SUB_DECAY', 0.2, 8.0, 2.5, 's'],
        p5: ['SATURATION', 0, 80, 10, '%'], p6: ['LP_FILTER', 80, 300, 120, 'Hz']
    },
    'acid_line': {
        p1: ['CUTOFF', 300, 3500, 1200, 'Hz'], p2: ['RESONANCE', 1, 20, 8, 'Q'],
        p3: ['ENV_MOD', 0, 100, 50, '%'], p4: ['DECAY_TIME', 0.1, 2.0, 0.5, 's'],
        p5: ['PITCH_KEY', 40, 220, 65, 'Hz'], p6: ['ACCENT', 0, 100, 30, '%']
    }
};

function resizeCanvas() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function logEvent(msg) {
    const hex = Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
    lunarLog.innerHTML = `[0x${hex}] ${msg}<br>` + lunarLog.innerHTML.split('<br>').slice(0, 4).join('<br>');
}

// --- BENZERSİZ SES İMZASI (PRESET HASH) MOTORU ---
function generateSonicFingerprint(params) {
    // Her parametre için sabit bir asal sayı çarpanı (Çakışmaları önlemek için)
    const weights = [3, 7, 13, 17, 23, 29];
    let total = 0;

    // Parametreleri ağırlıklarıyla çarpıp topluyoruz
    params.forEach((val, idx) => {
        total += Math.abs(val) * (weights[idx] || 1);
    });

    // Sonucu her zaman 5 haneli temiz bir sayıya sabitliyoruz (10000 - 99999 arası)
    const shortID = (Math.floor(total * 1337) % 90000) + 10000;
    return shortID;
}

function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;

    globalGain = audioCtx.createGain();
    globalGain.gain.setValueAtTime(0.35, audioCtx.currentTime);

    masterWaveShaper = audioCtx.createWaveShaper();
    
    masterBitCrusher = audioCtx.createScriptProcessor(4096, 1, 1);
    masterBitCrusher.onaudioprocess = function(e) {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        
        if (currentCrushVal <= 0) {
            output.set(input);
            return;
        }

        const bits = Math.max(2, 16 - (currentCrushVal / 6.5)); 
        const step = Math.pow(0.5, bits);

        for (let i = 0; i < input.length; i++) {
            output[i] = step * Math.round(input[i] / step);
        }
    };

    masterCompressor = audioCtx.createDynamicsCompressor();
    analyser.connect(audioCtx.destination);

    updateMasterFX();
    drawVisualizer();
    logEvent("AUDIO_FX_PIPELINE_LOADED");
}

function makeDistortionCurve(amount) {
    let curve = new Float32Array(44100);
    for (let i = 0; i < 44100; ++i) {
        let x = (i * 2) / 44100 - 1;
        curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

function updateMasterFX() {
    if (!audioCtx) return;

    try { globalGain.disconnect(); } catch(e){}
    try { masterWaveShaper.disconnect(); } catch(e){}
    try { masterBitCrusher.disconnect(); } catch(e){}
    try { masterCompressor.disconnect(); } catch(e){}

    globalGain.connect(masterWaveShaper);
    
    if (currentCrushVal > 0) {
        masterWaveShaper.connect(masterBitCrusher);
        masterBitCrusher.connect(masterCompressor);
    } else {
        masterWaveShaper.connect(masterCompressor); 
    }
    
    masterCompressor.connect(analyser);

    const driveVal = parseFloat(masterDriveSlider.value);
    vMasterDrive.innerText = driveVal + "%";
    masterWaveShaper.curve = driveVal > 0 ? makeDistortionCurve(driveVal * 2.5) : null;

    const compVal = parseFloat(masterCompSlider.value);
    vMasterComp.innerText = compVal + "%";
    masterCompressor.threshold.setValueAtTime(-compVal / 1.5, audioCtx.currentTime);
}

masterDriveSlider.oninput = updateMasterFX;
masterCompSlider.oninput = updateMasterFX;

masterCrushSlider.oninput = (e) => {
    const val = e.target.value;
    currentCrushVal = parseFloat(val);
    if (val == 0) {
        vMasterCrush.innerText = "OFF";
    } else {
        const bits = Math.max(2, 16 - (val / 6.5));
        vMasterCrush.innerText = `${bits.toFixed(1)} BIT`;
    }
    updateMasterFX(); 
};

document.getElementById('r-mdrive').onclick = () => { masterDriveSlider.value = 0; updateMasterFX(); logEvent("RESET_MASTER_DRIVE"); };
document.getElementById('r-mcrush').onclick = () => { masterCrushSlider.value = 0; currentCrushVal = 0; vMasterCrush.innerText = "OFF"; updateMasterFX(); logEvent("RESET_MASTER_CRUSH"); };
document.getElementById('r-mcomp').onclick = () => { masterCompSlider.value = 20; updateMasterFX(); logEvent("RESET_MASTER_COMPRESSOR"); };

randomizeBtn.addEventListener('click', () => {
    if (!activeDrum) return;
    const spec = drumSpecs[activeDrum];
    const keys = Object.keys(spec);
    
    function logRandom(min, max) {
        const logMin = Math.log(min <= 0 ? 0.01 : min);
        const logMax = Math.log(max);
        return Math.exp(logMin + Math.random() * (logMax - logMin));
    }

    paramRows.forEach((row, idx) => {
        const key = keys[idx];
        if (!key) return;
        const input = row.querySelector('input[type="range"]');
        const valueSpan = row.querySelector('.param-value');
        const data = spec[key];

        let min = data[1], max = data[2];
        let newVal;

        if (data[0].includes('DECAY') || data[0].includes('TIME') || data[0].includes('FREQ') || data[0].includes('PITCH') || data[0].includes('CUTOFF') || data[0].includes('FILTER')) {
            newVal = logRandom(min, max);
        } else {
            newVal = Math.random() * (max - min) + min;
        }

        if (input.step === '0.01') {
            newVal = parseFloat(newVal.toFixed(2));
        } else {
            newVal = Math.floor(newVal);
        }

        newVal = Math.max(min, Math.min(max, newVal));
        input.value = newVal;
        valueSpan.innerText = newVal + data[4];
    });

    logEvent(`LOG_SMART_RANDOM_${activeDrum.toUpperCase()}`);
});

globalResetBtn.addEventListener('click', () => {
    masterDriveSlider.value = 0;
    masterCrushSlider.value = 0;
    currentCrushVal = 0; 
    masterCompSlider.value = 20;
    vMasterCrush.innerText = "OFF";
    updateMasterFX();
    if (activeDrum) loadDrumEngine(activeDrum);
    logEvent("GLOBAL_HARD_RESET_EXECUTED");
});

drumButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!audioCtx) initAudio();
        drumButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeDrum = btn.getAttribute('data-drum');
        logEvent(`MOUNTING_${activeDrum.toUpperCase()}`);
        loadDrumEngine(activeDrum);
    });
});

function loadDrumEngine(type) {
    emptyState.classList.add('hidden');
    paramControls.classList.remove('hidden');
    moduleMetaActions.classList.remove('hidden'); 
    triggerArea.classList.remove('hidden');

    const spec = drumSpecs[type];
    if (!spec) return;
    const keys = Object.keys(spec);

    paramRows.forEach((row, idx) => {
        const key = keys[idx];
        if (!key) return;

        const label = row.querySelector('.param-label');
        const input = row.querySelector('input[type="range"]');
        const valueSpan = row.querySelector('.param-value');
        const resetBtn = row.querySelector('.reset-btn');
        const data = spec[key];

        label.innerText = data[0];
        input.min = data[1];
        input.max = data[2];
        input.value = data[3];
        
        if (data[0].includes('DECAY') || data[0].includes('TIME') || data[0].includes('DELAY') || data[0].includes('SNAP') || data[0].includes('ATTACK')) {
            input.step = '0.01';
        } else {
            input.step = '1';
        }
        
        valueSpan.innerText = input.value + data[4];

        input.oninput = (e) => {
            valueSpan.innerText = e.target.value + data[4];
        };

        resetBtn.onclick = () => {
            const defaultVal = data[3];
            input.value = defaultVal;
            valueSpan.innerText = defaultVal + data[4];
            logEvent(`RESET_PARAM_${data[0]}`);
        };
    });
}

function routeEngine(type, params, ctxTarget, outputNode, timeStart) {
    switch(type) {
        case '808': run808(params, ctxTarget, outputNode, timeStart); break;
        case 'kick': runKick(params, ctxTarget, outputNode, timeStart); break;
        case 'snare': runSnare(params, ctxTarget, outputNode, timeStart); break;
        case 'clap': runClap(params, ctxTarget, outputNode, timeStart); break;
        case 'closed_hat': runClosedHat(params, ctxTarget, outputNode, timeStart); break;
        case 'open_hat': runOpenHat(params, ctxTarget, outputNode, timeStart); break;
        case 'sub_bass': runSubBass(params, ctxTarget, outputNode, timeStart); break;
        case 'acid_line': runAcidLine(params, ctxTarget, outputNode, timeStart); break;
    }
}

triggerBtn.addEventListener('click', () => {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!activeDrum) return;

    const p = Array.from(paramRows).map(row => {
        const inp = row.querySelector('input[type="range"]');
        return inp ? parseFloat(inp.value) : 0;
    });
    vizPanel.classList.add('shake');
    signalAlert.innerText = `SIGNAL_FIRE_${activeDrum.toUpperCase()}`;
    signalAlert.classList.add('firing');
    logEvent(`SIG_EXEC_//_${activeDrum.toUpperCase()}`);

    setTimeout(() => {
        vizPanel.classList.remove('shake');
        signalAlert.innerText = "STATUS_OK";
        signalAlert.classList.remove('firing');
    }, 100);

    routeEngine(activeDrum, p, audioCtx, globalGain, audioCtx.currentTime);
});

// --- DİNAMİK SÜRELİ EXPORT MOTORU ---
exportBtn.addEventListener('click', () => {
    if (!activeDrum) return;

    // 1. Aktif parametre değerlerini topluyoruz
    const p = Array.from(paramRows).map(row => {
        const inp = row.querySelector('input[type="range"]');
        return inp ? parseFloat(inp.value) : 0;
    });

    // 2. 5 haneli kısa sayısal kimliği üret
    const uniqueID = generateSonicFingerprint(p);
    logEvent(`PREPARING_WAV_RENDER_//_ID_${uniqueID}`);

    // 3. DİNAMİK SÜRE HESAPLAMA (Ses ne kadar uzunsa render o kadar sürer)
    let decayValue = 1.0; // Default güvenli süre

    if (activeDrum === '808') decayValue = p[2];          // DECAY_TIME
    else if (activeDrum === 'kick') decayValue = p[2];     // KICK_DECAY
    else if (activeDrum === 'snare') decayValue = p[2];    // CRISP_DECAY (Noise en uzun olanı)
    else if (activeDrum === 'clap') decayValue = p[2];     // MAIN_DECAY
    else if (activeDrum === 'closed_hat') decayValue = p[1];// HAT_DECAY
    else if (activeDrum === 'open_hat') decayValue = p[1];  // OPEN_DECAY
    else if (activeDrum === 'sub_bass') decayValue = p[3];  // SUB_DECAY
    else if (activeDrum === 'acid_line') decayValue = p[3]; // DECAY_TIME

    // Sesi tetikleme süresi + Decay süresi + 100ms dijital çıtlamayı önleme payı
    const duration = Math.max(0.1, decayValue + 0.1); 

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

    const offlineGain = offlineCtx.createGain();
    offlineGain.gain.setValueAtTime(0.45, 0); 

    const offlineShaper = offlineCtx.createWaveShaper();
    const driveVal = parseFloat(masterDriveSlider.value);
    if (driveVal > 0) {
        let curve = new Float32Array(44100);
        for (let i = 0; i < 44100; ++i) {
            let x = (i * 2) / 44100 - 1;
            curve[i] = ((3 + (driveVal * 2.5)) * x * 20 * (Math.PI / 180)) / (Math.PI + (driveVal * 2.5) * Math.abs(x));
        }
        offlineShaper.curve = curve;
    }

    const offlineComp = offlineCtx.createDynamicsCompressor();
    const compVal = parseFloat(masterCompSlider.value);
    offlineComp.threshold.setValueAtTime(-compVal / 1.5, 0);

    offlineGain.connect(offlineShaper);
    offlineShaper.connect(offlineComp);
    offlineComp.connect(offlineCtx.destination);

    // Sesi tam 0. saniyede tetikliyoruz
    routeEngine(activeDrum, p, offlineCtx, offlineGain, 0);

    offlineCtx.startRendering().then(renderedBuffer => {
        const wavBlob = bufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        
        const prefix = activeDrum.toUpperCase() === 'CLOSED_HAT' ? 'HAT' : activeDrum.toUpperCase();
        a.download = `LS${prefix}_${uniqueID}.wav`;
        
        a.click();
        logEvent(`WAV_EXPORT_SUCCESS_//_ID_${uniqueID}`);
    }).catch(err => {
        logEvent("EXPORT_ERROR_RENDER_FAILED");
    });
});

function bufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length),
        view = new DataView(bufferArr),
        channels = [], i, sample, offset = 0, pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

    for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true); pos += 2;
        }
        offset++;
    }
    return new Blob([bufferArr], { type: 'audio/wav' });
}

// --- SES MOTORU ALGOLARI ---
function run808(p, c, g, now) {
    const osc = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    osc.type = 'sine'; filter.type = 'lowpass'; filter.frequency.setValueAtTime(p[5], now);
    osc.connect(filter); filter.connect(gain); gain.connect(g);
    
    const startFreq = Math.max(1, p[0]);
    const endFreq = Math.max(1, p[1]);
    
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + (p[4] / 1000));
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p[2]);
    osc.start(now); osc.stop(now + p[2]);
}

function runKick(p, c, g, now) {
    const osc = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    osc.type = 'sine'; filter.type = 'lowpass'; filter.frequency.setValueAtTime(p[5], now);
    osc.connect(filter); filter.connect(gain); gain.connect(g);
    
    osc.frequency.setValueAtTime(p[0], now); 
    osc.frequency.linearRampToValueAtTime(p[1], now + (p[4] / 1000));
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p[2]);
    osc.start(now); osc.stop(now + p[2]);
}

function runSnare(p, c, g, now) {
    const osc = c.createOscillator();
    const oscGain = c.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(p[0] * 2.5, now); 
    osc.frequency.exponentialRampToValueAtTime(p[0], now + 0.02);
    osc.frequency.linearRampToValueAtTime(80, now + p[3]);
    
    oscGain.gain.setValueAtTime((1 - (p[1] / 100)) * 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + p[3]);
    
    osc.connect(oscGain);
    oscGain.connect(g);

    const bufSize = Math.floor(c.sampleRate * p[2]);
    const buffer = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(p[4], now);
    
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime((p[1] / 100) * 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + p[2]);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(g);

    osc.start(now);
    osc.stop(now + p[3]);
    noise.start(now);
    noise.stop(now + p[2]);
}

function runClap(p, c, g, now) {
    const bufSize = Math.floor(c.sampleRate * (p[2] + 0.1)), buffer = c.createBuffer(1, bufSize, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource(); source.buffer = buffer;
    const bpFilter = c.createBiquadFilter(); bpFilter.type = 'bandpass'; bpFilter.frequency.setValueAtTime(p[0], now);
    const gain = c.createGain(); gain.gain.setValueAtTime(0, now);
    let tTime = now;
    for (let i = 0; i < p[3]; i++) {
        gain.gain.setValueAtTime(0.22, tTime); gain.gain.exponentialRampToValueAtTime(0.01, tTime + (p[1] / 1000) * 0.8);
        tTime += (p[1] / 1000);
    }
    gain.gain.setValueAtTime(0.35, tTime); gain.gain.exponentialRampToValueAtTime(0.001, tTime + p[2]);
    source.connect(bpFilter); bpFilter.connect(gain); gain.connect(g);
    source.start(now); source.stop(tTime + p[2]);
}

function runClosedHat(p, c, g, now) {
    const bufSize = Math.floor(c.sampleRate * p[1]), buffer = c.createBuffer(1, bufSize, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource(); source.buffer = buffer;
    const filter = c.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime(p[0], now);
    const gain = c.createGain(); gain.gain.setValueAtTime((p[3] / 100) * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p[1]);
    source.connect(filter); filter.connect(gain); gain.connect(g);
    source.start(now); source.stop(now + p[1]);
}

function runOpenHat(p, c, g, now) {
    const bufSize = Math.floor(c.sampleRate * p[1]), buffer = c.createBuffer(1, bufSize, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource(); source.buffer = buffer;
    const filter = c.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime(p[0], now);
    const gain = c.createGain(); gain.gain.setValueAtTime((p[3] / 100) * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p[1]);
    source.connect(filter); filter.connect(gain); gain.connect(g);
    source.start(now); source.stop(now + p[1]);
}

function runSubBass(p, c, g, now) {
    const osc = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    osc.type = 'sine'; filter.type = 'lowpass'; filter.frequency.setValueAtTime(p[5], now);
    osc.connect(filter); filter.connect(gain); gain.connect(g);
    
    const startFreq = Math.max(1, p[0]);

    if (p[1] > 0) {
        osc.frequency.setValueAtTime(Math.max(1, p[1]), now);
        osc.frequency.linearRampToValueAtTime(startFreq, now + (p[2] / 1000));
    } else {
        osc.frequency.setValueAtTime(startFreq, now);
    }
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p[3]);
    osc.start(now); osc.stop(now + p[3]);
}

function runAcidLine(p, c, g, now) {
    const osc = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(p[4], now);
    filter.type = 'lowpass'; filter.Q.setValueAtTime(p[1], now);
    filter.frequency.setValueAtTime(p[0] + (p[5] * 10), now);
    filter.frequency.exponentialRampToValueAtTime(p[0], now + p[3]);
    osc.connect(filter); filter.connect(gain); gain.connect(g);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p[3]);
    osc.start(now); osc.stop(now + p[3]);
}

let lastTime = 0;
const fps = 30; 
const interval = 1000 / fps;

function drawVisualizer(timestamp) {
    requestAnimationFrame(drawVisualizer);
    if (!analyser) return;

    if (!timestamp) timestamp = performance.now();
    const elapsed = timestamp - lastTime;
    if (elapsed < interval) return;
    lastTime = timestamp - (elapsed % interval);

    const bufferLength = analyser.frequencyBinCount;
    const dataArrayFreq = new Uint8Array(bufferLength);
    const dataArrayTime = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArrayFreq);
    analyser.getByteTimeDomainData(dataArrayTime);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    gridOffset += 0.5; 
    if (gridOffset >= 40) gridOffset = 0;

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.27)'; 

    for (let xPos = 0; xPos < canvas.width; xPos += 40) {
        ctx.beginPath(); ctx.moveTo(xPos, 0); ctx.lineTo(xPos, canvas.height); ctx.stroke();
    }
    for (let yPos = (gridOffset % 40); yPos < canvas.height; yPos += 40) {
        ctx.beginPath(); ctx.moveTo(0, yPos); ctx.lineTo(canvas.width, yPos); ctx.stroke();
    }

    const barWidth = (canvas.width / bufferLength) * 2.2;
    let x = 0;
    let totalEnergy = 0;

    for (let i = 0; i < bufferLength; i++) {
        let barHeight = dataArrayFreq[i] * (canvas.height / 255) * 0.82;
        totalEnergy += dataArrayFreq[i];

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, dataArrayFreq[i] / 255 * 0.75)})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1.5, barHeight);

        x += barWidth;
    }

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let waveX = 0;
    const avgEnergy = totalEnergy / bufferLength;
    
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArrayTime[i] / 128.0;
        const y = (v * canvas.height / 2) + Math.sin(i * 0.04) * (avgEnergy * 0.06);
        
        if (i === 0) ctx.moveTo(waveX, y); else ctx.lineTo(waveX, y);
        waveX += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    const normEnergy = avgEnergy / 255;
    const vuHeight = Math.min(100, normEnergy * 500); 
    vuL.style.height = `${vuHeight}%`; 
    vuR.style.height = `${vuHeight * 0.96}%`;
}