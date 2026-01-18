class VADProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.threshold = 0.01; // Adjust based on environment
        this.bufferSize = 1024;
        this.isVoiceActive = false;
        this.silenceCounter = 0;
        this.minSilenceDuration = 20; // in samples blocks
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const samples = input[0];
            let sum = 0;
            for (let i = 0; i < samples.length; i++) {
                sum += samples[i] * samples[i];
            }
            const rms = Math.sqrt(sum / samples.length);

            if (rms > this.threshold) {
                if (!this.isVoiceActive) {
                    this.isVoiceActive = true;
                    this.port.postMessage({ type: 'VAD_START', rms });
                }
                this.silenceCounter = 0;
            } else {
                this.silenceCounter++;
                if (this.isVoiceActive && this.silenceCounter > this.minSilenceDuration) {
                    this.isVoiceActive = false;
                    this.port.postMessage({ type: 'VAD_END', rms });
                }
            }
        }
        return true;
    }
}

registerProcessor('vad-processor', VADProcessor);
