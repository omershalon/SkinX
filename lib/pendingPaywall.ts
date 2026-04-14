let _pending: { onboardingData: string; analysisResult: string; photoFront: string } | null = null;

export function setPendingPaywall(data: { onboardingData: string; analysisResult: string; photoFront: string }) {
  _pending = data;
}

export function takePendingPaywall() {
  const v = _pending;
  _pending = null;
  return v;
}
