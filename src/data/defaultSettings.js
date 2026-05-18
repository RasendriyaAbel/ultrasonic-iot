export function defaultSettings() {
  return {
    capacityLiter: 60,
    tankHeightCm: 50,
    ultrasonicToBottomCm: 50,
    lowThresholdPercent: 30,
    criticalThresholdPercent: 15,
    leakDiffThresholdLpm: 0.5,
    leakLossThresholdPercent: 15,
  }
}
