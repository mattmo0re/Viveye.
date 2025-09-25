class VocalRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    const payload = input.map((channel) => {
      const clone = new Float32Array(channel.length);
      clone.set(channel);
      return clone;
    });
    this.port.postMessage(payload);
    return true;
  }
}

registerProcessor('vocal-recorder', VocalRecorderProcessor);
