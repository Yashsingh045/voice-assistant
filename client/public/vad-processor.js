class VADProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.threshold = 0.02; // Increased threshold for better noise rejection
        this.bufferSize = 1024;
        this.isVoiceActive = false;
        this.silenceCounter = 0;
        this.minSilenceDuration = 30; // Increased to ~1 second for more reliable detection
        this.voiceStartCounter = 0;
        this.minVoiceDuration = 5; // Require 5 blocks of voice before declaring start
    }

    process(inputs, _outputs, _parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const samples = input[0];
            let sum = 0;
            for (let i = 0; i < samples.length; i++) {
                sum += samples[i] * samples[i];
            }
            const rms = Math.sqrt(sum / samples.length);

            if (rms > this.threshold) {
                this.voiceStartCounter++;
                if (!this.isVoiceActive && this.voiceStartCounter > this.minVoiceDuration) {
                    this.isVoiceActive = true;
                    this.port.postMessage({ type: 'VAD_START', rms });
                }
                this.silenceCounter = 0;
            } else {
                this.voiceStartCounter = 0;
                this.silenceCounter++;
                if (this.isVoiceActive && this.silenceCounter > this.minSilenceDuration) {
                    this.isVoiceActive = false;
                    this.port.postMessage({ type: 'VAD_END', rms });
                }
            }

            // Always stream audio data to the port
            this.port.postMessage({
                type: 'AUDIO_DATA',
                audio: samples // This is a Float32Array
            });
        }
        return true;
    }
}

registerProcessor('vad-processor', VADProcessor);
