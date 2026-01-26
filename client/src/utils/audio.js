export const createWavHeader = (pcmData) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier 'RIFF'
    view.setUint32(0, 0x52494646, false);
    // file length
    view.setUint32(4, 36 + pcmData.byteLength, true);
    // RIFF type 'WAVE'
    view.setUint32(8, 0x57415645, false);
    // format chunk identifier 'fmt '
    view.setUint32(12, 0x666d7420, false);
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, 16000, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, 16000 * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier 'data'
    view.setUint32(36, 0x64617461, false);
    // data chunk length
    view.setUint32(40, pcmData.byteLength, true);

    const blob = new Uint8Array(header.byteLength + pcmData.byteLength);
    blob.set(new Uint8Array(header), 0);
    blob.set(new Uint8Array(pcmData), 44);

    return blob.buffer;
};
