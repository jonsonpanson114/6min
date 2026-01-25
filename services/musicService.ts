
import * as Tone from 'tone';

// Simple sentiment analysis (mock) - in a real app, this could use an AI score or a library
const analyzeSentiment = (text: string): { valence: number; energy: number } => {
    const positiveWords = ['感謝', '最高', '良', '光', '愛', '楽', '喜', '笑', '成功', '美'];
    const negativeWords = ['疲', '悲', '苦', '痛', '暗', '失敗', '怒', '不安', '辛', '悪'];

    let score = 0;
    text.split('').forEach(char => {
        // Checking substrings for simple matching
        if (positiveWords.some(w => text.includes(w))) score += 1;
        if (negativeWords.some(w => text.includes(w))) score -= 1;
    });

    // Normalize roughly between -1 and 1
    const valence = Math.max(-1, Math.min(1, score / 5));
    const energy = Math.min(1, text.length / 200); // Longer text = higher energy/complexity

    return { valence, energy };
};

let synth: Tone.PolySynth | null = null;
let loop: Tone.Loop | null = null;
let reverb: Tone.Reverb | null = null;
let isPlaying = false;

export const MusicService = {
    async init() {
        await Tone.start();

        if (!synth) {
            reverb = new Tone.Reverb({ decay: 5, wet: 0.5 }).toDestination();

            synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "sine" },
                envelope: { attack: 2, decay: 1, sustain: 0.5, release: 2 }
            }).connect(reverb);
        }
    },

    async playSoulMelody(text: string) {
        await this.init();

        if (isPlaying) {
            this.stop();
        }

        const { valence, energy } = analyzeSentiment(text);

        // Determine scale and notes based on sentiment
        // Positive -> Major Pentatonic / Negative -> Minor
        const root = "C4";
        const majorScale = ["C4", "D4", "E4", "G4", "A4", "C5"];
        const minorScale = ["C4", "Eb4", "F4", "G4", "Bb4", "C5"];
        const scale = valence >= 0 ? majorScale : minorScale;

        // Tempo based on energy
        Tone.Transport.bpm.value = 60 + (energy * 40); // 60-100 BPM

        isPlaying = true;
        Tone.Transport.start();

        // Create a generative loop
        loop = new Tone.Loop((time) => {
            // Pick random notes from scale
            const note1 = scale[Math.floor(Math.random() * scale.length)];
            const note2 = scale[Math.floor(Math.random() * scale.length)];

            // Determine probability of playing based on energy
            if (Math.random() > 0.3) {
                synth?.triggerAttackRelease([note1, note2], "2n", time);
            }
        }, "1n").start(0);
    },

    stop() {
        if (loop) {
            loop.stop();
            loop.dispose();
            loop = null;
        }
        Tone.Transport.stop();
        // Release any stuck notes
        synth?.releaseAll();
        isPlaying = false;
    }
};
