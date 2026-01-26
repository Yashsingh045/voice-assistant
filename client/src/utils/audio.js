import { useState, useRef, useCallback, useEffect } from 'react';

export const createWavHeader = (pcmData) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + pcmData.byteLength, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 16000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, pcmData.byteLength, true);

    const blob = new Uint8Array(header.byteLength + pcmData.byteLength);
    blob.set(new Uint8Array(header), 0);
    blob.set(new Uint8Array(pcmData), 44);

    return blob.buffer;
};

export const useAudioStreaming = () => {
    const [audioData, setAudioData] = useState(new Uint8Array(40).fill(0));
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);
    const processorRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    const startStreaming = useCallback(async (onData) => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });

            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            // Animation loop for visualizer
            const updateVisualizer = () => {
                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    // Downsample to 40 bars for the UI
                    const downsampled = new Uint8Array(40);
                    const step = Math.floor(dataArray.length / 40);
                    for (let i = 0; i < 40; i++) {
                        downsampled[i] = dataArray[i * step];
                    }
                    setAudioData(downsampled);
                    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
                }
            };
            updateVisualizer();

            // Audio worklet or script processor to get raw PCM
            // For simplicity and 16kHz requirement, we'll use a script processor
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);

            processorRef.current.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16 PCM
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                onData(pcmData.buffer);
            };

        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    }, []);

    const stopStreaming = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setAudioData(new Uint8Array(40).fill(0));
    }, []);

    return { startStreaming, stopStreaming, audioData };
};

export const useAudioPlayer = () => {
    const audioContextRef = useRef(null);
    const nextStartTimeRef = useRef(0);

    const playChunk = useCallback(async (pcmBuffer) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }

        const int16Data = new Int16Array(pcmBuffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 0x8000;
        }

        const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 16000);
        audioBuffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        // Schedule the chunk to play immediately after the previous one
        const startTime = Math.max(audioContextRef.current.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
    }, []);

    const stopPlayback = useCallback(() => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        nextStartTimeRef.current = 0;
    }, []);

    return { playChunk, stopPlayback };
};
