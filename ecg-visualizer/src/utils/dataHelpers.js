export const formatData = (signal = []) =>
  signal.map((v, i) => ({ index: i, value: v }));

export const downsample = (arr, factor = 10) =>
  arr.filter((_, i) => i % factor === 0);