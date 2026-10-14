import soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("tts-models/kokoro-v1.0.int8.onnx", "tts-models/voices-v1.0.bin")
text = "Supreme excellence consists in breaking the enemy's resistance... without fighting."
for voice in ["bm_george", "bm_lewis", "am_onyx", "am_fenrir", "am_michael"]:
    samples, sr = k.create(text, voice=voice, speed=0.85, lang="en-us" if voice.startswith("a") else "en-gb")
    sf.write(f"voice/raw-{voice}.wav", samples, sr)
    print(voice, sr, round(len(samples)/sr, 2), "s")
