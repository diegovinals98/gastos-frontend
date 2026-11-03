/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'SaldoWidget',
  displayName: 'Saldo',
  bundleIdentifier: '.saldo-widget',
  // containerBackground y los widgets de pantalla de bloqueo necesitan iOS 17
  deploymentTarget: '17.0',
  colors: {
    $accent: { color: '#34C759', darkColor: '#30D158' },
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
