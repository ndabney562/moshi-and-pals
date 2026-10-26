import { expect, it, vi } from 'vitest';

function audioSession() {
  const gain = { value: 0, setTargetAtTime: vi.fn() };
  const ctx = {
    state: 'suspended', currentTime: 1, sampleRate: 4, destination: {}, resume: vi.fn().mockResolvedValue(undefined),
    createGain: () => ({ gain, connect: vi.fn().mockReturnThis() }),
    createDynamicsCompressor: () => ({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect: vi.fn().mockReturnThis() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(4) }),
  };
  return { ctx, gain, scene: { sound: { context: ctx } } };
}
it('coalesces repeated recovery gestures and ignores a closed audio session', async () => {
  const { initSfx, resumeAudio } = await import('../../src/core/sfx');
  const { ctx, scene } = audioSession();
  initSfx(scene as any);
  resumeAudio(); resumeAudio();
  expect(ctx.resume).toHaveBeenCalledTimes(1);
  await Promise.resolve(); await Promise.resolve();
  ctx.state = 'closed';
  resumeAudio();
  expect(ctx.resume).toHaveBeenCalledTimes(1);
});
it('contains both synchronous and rejected audio-resume failures', async () => {
  const { initSfx, resumeAudio } = await import('../../src/core/sfx');
  const { ctx, scene } = audioSession();
  initSfx(scene as any);
  ctx.resume.mockImplementationOnce(() => { throw new Error('interrupted'); });
  expect(resumeAudio).not.toThrow();
  ctx.resume.mockRejectedValueOnce(new Error('denied'));
  resumeAudio();
  await Promise.resolve(); await Promise.resolve();
  expect(ctx.resume).toHaveBeenCalledTimes(2);
});
it('ramps mute changes to avoid discontinuities in the output gain', async () => {
  const { initSfx, setSfxMuted } = await import('../../src/core/sfx');
  const { gain, scene } = audioSession();
  initSfx(scene as any);
  setSfxMuted(true);
  expect(gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.015);
  setSfxMuted(false);
  expect(gain.setTargetAtTime).toHaveBeenLastCalledWith(0.5, 1, 0.015);
});
