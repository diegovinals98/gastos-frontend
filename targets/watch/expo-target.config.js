/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  name: 'VICAWatch',
  displayName: 'VICA',
  // Apple exige que la app del reloj cuelgue del bundle id de la app del iPhone
  bundleIdentifier: '.watchkitapp',
  // containerBackground y la navegación vertical por páginas necesitan watchOS 10
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  colors: {
    $accent: { color: '#34C759', darkColor: '#30D158' },
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
