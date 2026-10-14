import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("tts-models/kokoro-v1.0.int8.onnx", "tts-models/voices-v1.0.bin")
text = "Supreme excellence... consists in breaking the enemy's resistance... without fighting. Sun Tzu."
onyx = k.get_voice_style("am_onyx")
variants = {
    "A-george-onyx": (0.7 * k.get_voice_style("bm_george") + 0.3 * onyx, "en-gb"),
    "B-lewis-onyx": (0.7 * k.get_voice_style("bm_lewis") + 0.3 * onyx, "en-gb"),
    "C-michael-onyx": (0.7 * k.get_voice_style("am_michael") + 0.3 * onyx, "en-us"),
}
for name, (style, lang) in variants.items():
    s, sr = k.create(text, voice=style.astype(np.float32), speed=0.82, lang=lang, sentence_pause=0.65, clause_pause=0.35)
    sf.write(f"voice/raw2-{name}.wav", s, sr)
    print(name, round(len(s) / sr, 2), "s")
