/**
 * HSD Malatya Turgut Özal Üniversitesi Çalışma Alanı
 * Web Audio API Tescilli Bildirim Sesi Üreteci
 * 
 * Sıfır harici dosya (.mp3 / .wav) bağımlılığı ile tarayıcının yerel ses sentezleyicisini kullanır.
 * Canlı, net, modern ve profesyonel iki tonlu melodik akor (D5 587.33 Hz -> A5 880 Hz).
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return null;
        if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
            sharedAudioCtx = new AudioCtxClass();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume();
        }
        return sharedAudioCtx;
    } catch {
        return null;
    }
}

/**
 * Modern ve hoş bir bildirim sesi çalar (Web Audio API)
 * @param volume Ses şiddeti (0.01 - 1.0, varsayılan: 0.15 nazik ve göz yormayan)
 */
export function playWorkspaceNotificationSound(volume: number = 0.15): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;

        // Master Gain (Genel Ses Çıkışı)
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume, now);
        masterGain.connect(ctx.destination);

        // 1. Ton: D5 (587.33 Hz) - Yumuşak başlangıç
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.7, now + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc1.connect(gain1);
        gain1.connect(masterGain);

        osc1.start(now);
        osc1.stop(now + 0.3);

        // 2. Ton: A5 (880.00 Hz) - 90ms sonra yükselen parlak melodik bitiş
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880.0, now + 0.09);

        gain2.gain.setValueAtTime(0, now + 0.09);
        gain2.gain.linearRampToValueAtTime(0.9, now + 0.11);
        gain2.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);

        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc2.start(now + 0.09);
        osc2.stop(now + 0.6);

        // 3. Ton (Harmonik Parıltı): D6 (1174.66 Hz) - İnce yankı efekti
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(1174.66, now + 0.12);

        gain3.gain.setValueAtTime(0, now + 0.12);
        gain3.gain.linearRampToValueAtTime(0.35, now + 0.14);
        gain3.gain.exponentialRampToValueAtTime(0.0005, now + 0.45);

        osc3.connect(gain3);
        gain3.connect(masterGain);

        osc3.start(now + 0.12);
        osc3.stop(now + 0.5);

    } catch (err) {
        console.warn('Bildirim sesi çalınamadı:', err);
    }
}
