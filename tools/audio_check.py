#!/usr/bin/env python3
"""Audio checks for HELD (independent of the in-page mastering code).

  python3 tools/audio_check.py review/audio/film [--cues cues.json] [--plot out.png]

Reads <prefix>_mix.wav, _music.wav, _sfx.wav (float32 WAV). Reports:
  * integrated loudness (ITU-R BS.1770-4, with gating), short-term range
  * sample peak and 4x-oversampled true peak (dBTP), clipping
  * silences (regions under -50 dBFS RMS longer than 0.5 s)
  * for each cue (name, t): SFX stem level vs music stem level in a window
    after the cue, i.e. is the cue audible and not masked?
"""
import sys, json, wave, struct
import numpy as np
from scipy import signal


def read_wav(path):
    with open(path, 'rb') as f:
        data = f.read()
    # minimal float32 WAV reader
    assert data[:4] == b'RIFF' and data[8:12] == b'WAVE'
    pos = 12
    fmt = None
    while pos < len(data):
        cid = data[pos:pos + 4]
        size = struct.unpack('<I', data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + size]
        if cid == b'fmt ':
            fmt = struct.unpack('<HHIIHH', body[:16])
        elif cid == b'data':
            nc = fmt[1]
            x = np.frombuffer(body, dtype='<f4').reshape(-1, nc).T.astype(np.float64)
            return x, fmt[2]
        pos += 8 + size
    raise ValueError('no data')


def k_weight(x, sr):
    # BS.1770 K-weighting, designed for any sample rate (Pyloudnorm-style derivation)
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh, Vb = 10 ** (G / 20), 10 ** (G / 40) ** 2
    Vb = 10 ** (G / 40)
    a0 = 1 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    x = signal.lfilter(b, a, x, axis=-1)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a0 = 1 + K / Q + K * K
    b = [1, -2, 1]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    return signal.lfilter(b, a, x, axis=-1)


def loudness(x, sr):
    y = k_weight(x, sr)
    blk, hop = int(0.4 * sr), int(0.1 * sr)
    n = (y.shape[1] - blk) // hop + 1
    z = np.array([np.mean(y[:, i * hop:i * hop + blk] ** 2, axis=1).sum() for i in range(n)])
    L = -0.691 + 10 * np.log10(np.maximum(z, 1e-12))
    g1 = z[L > -70]
    rel = -0.691 + 10 * np.log10(g1.mean()) - 10
    g2 = z[(L > -70) & (L > rel)]
    integ = -0.691 + 10 * np.log10(g2.mean())
    # short-term 3 s
    st = np.array([-0.691 + 10 * np.log10(max(z[i:i + 30].mean(), 1e-12)) for i in range(max(1, n - 29))])
    return integ, L, st


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=-1)
    return np.abs(up).max()


def main():
    prefix = sys.argv[1]
    mix, sr = read_wav(prefix + '_mix.wav')
    music, _ = read_wav(prefix + '_music.wav')
    sfx, _ = read_wav(prefix + '_sfx.wav')
    integ, mom, st = loudness(mix, sr)
    sp = np.abs(mix).max()
    tp = true_peak(mix)
    dur = mix.shape[1] / sr
    print(f'duration        {dur:.2f} s  ({sr} Hz)')
    print(f'integrated      {integ:.2f} LUFS')
    print(f'short-term      max {st.max():.1f}  min {st[st > -70].min() if (st > -70).any() else -99:.1f} LUFS')
    print(f'sample peak     {20 * np.log10(sp):.2f} dBFS')
    print(f'true peak       {20 * np.log10(tp):.2f} dBTP')
    print(f'clipped samples {(np.abs(mix) >= 1.0).sum()}')
    print(f'DC offset       {mix.mean(axis=1)}')
    # silences
    win = int(0.1 * sr)
    rms = np.sqrt(np.convolve((mix ** 2).mean(axis=0), np.ones(win) / win, mode='same'))
    db = 20 * np.log10(np.maximum(rms, 1e-9))
    quiet = db < -50
    regions, start = [], None
    for i in range(0, len(quiet), win // 2):
        if quiet[i] and start is None:
            start = i
        elif not quiet[i] and start is not None:
            if (i - start) / sr > 0.5:
                regions.append((start / sr, i / sr))
            start = None
    if start is not None and (len(quiet) - start) / sr > 0.5:
        regions.append((start / sr, len(quiet) / sr))
    print('silences (< -50 dBFS, > 0.5 s):', ', '.join(f'{a:.1f}-{b:.1f}' for a, b in regions) or 'none')
    if '--cues' in sys.argv:
        cues = json.load(open(sys.argv[sys.argv.index('--cues') + 1]))
        print('\ncue audibility (SFX stem vs music stem, 0.5 s window after the cue):')
        fails = 0
        for c in cues:
            t, name = c['t'], c['name']
            a, b = int(t * sr), int((t + c.get('win', 0.5)) * sr)
            def lev(x):
                y = k_weight(x[:, a:b], sr)
                return -0.691 + 10 * np.log10(max(np.mean(y ** 2, axis=1).sum(), 1e-12))
            ls, lm = lev(sfx), lev(music)
            ok = ls > -45 and ls > lm - 10
            fails += 0 if ok else 1
            print(f'  {t:7.2f}  {name:18s} sfx {ls:6.1f}  music {lm:6.1f}  {"ok" if ok else "MASKED/INAUDIBLE"}')
        print(f'  {fails} cue(s) failing')
    if '--plot' in sys.argv:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        out = sys.argv[sys.argv.index('--plot') + 1]
        fig, ax = plt.subplots(2, 1, figsize=(14, 6))
        ax[0].plot(np.arange(len(mom)) * 0.1, mom, lw=0.6, label='momentary')
        ax[0].plot(np.arange(len(st)) * 0.1 + 1.5, st, lw=1.2, label='short-term')
        ax[0].set_ylim(-60, 0); ax[0].axhline(integ, color='k', ls=':'); ax[0].legend(); ax[0].set_ylabel('LUFS')
        f, t, S = signal.spectrogram(mix.mean(axis=0), sr, nperseg=4096, noverlap=2048)
        ax[1].pcolormesh(t, f, 10 * np.log10(S + 1e-12), shading='auto', vmin=-120, vmax=-30)
        ax[1].set_yscale('symlog', linthresh=200); ax[1].set_ylim(30, 16000); ax[1].set_xlabel('s')
        fig.tight_layout(); fig.savefig(out, dpi=90)
        print('plot', out)


main()
