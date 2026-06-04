/** @type {const} */
const themeColors = {
  // ── Core palette ──────────────────────────────────────────────────────────
  primary:    { light: '#B98B3C', dark: '#C1A661' },   // muted gold for general use
  background: { light: '#EFE7D9', dark: '#282533' },   // parchment / void
  surface:    { light: '#F6F0E6', dark: '#35313F' },   // panel
  foreground: { light: '#231B15', dark: '#F4EBD9' },   // text
  muted:      { light: '#766A5F', dark: '#B0A291' },   // secondary text
  border:     { light: '#D4C3AA', dark: '#4A4352' },   // divider
  success:    { light: '#2E8B57', dark: '#58C98C' },
  warning:    { light: '#C98221', dark: '#E2A847' },
  error:      { light: '#B94C4C', dark: '#E27D7D' },

  // ── v7 Semantic aliases (ritual states) ──────────────────────────────────
  /** GatewayReveal deepest bg; deepest dark layer in ambient backdrop */
  void:       { light: '#EFE7D9', dark: '#16141C' },
  /** Ultra-subtle surface overlay — ghost cards, inactive states */
  ghost:      { light: '#D4C3AA44', dark: '#4A435244' },
  /** Motion glow color — same as primary, explicit semantic alias */
  ritual:     { light: '#B98B3C', dark: '#D8B86A' },
};

module.exports = { themeColors };
