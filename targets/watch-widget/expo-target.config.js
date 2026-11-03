/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch-widget',
  name: 'VICAComplications',
  displayName: 'VICA',
  // Las complicaciones cuelgan del bundle id de la app del reloj
  bundleIdentifier: '.watchkitapp.complications',
  deploymentTarget: '10.0',
  colors: {
    $accent: { color: '#34C759', darkColor: '#30D158' },
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
