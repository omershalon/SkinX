let _showPaywall = false;

export function requestPaywall() {
  _showPaywall = true;
}

export function consumePaywallRequest(): boolean {
  const v = _showPaywall;
  _showPaywall = false;
  return v;
}
