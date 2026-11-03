const { withXcodeProject } = require('expo/config-plugins');

// Expo escribe ASSETCATALOG_COMPILER_APPICON_NAME (icono Liquid Glass) en todas las
// configuraciones, también en las del widget, que falla al compilar porque su catálogo
// no tiene ese icono. Lo dejamos solo en las del target de la app.
module.exports = function withWidgetIconFix(config) {
  return withXcodeProject(config, (cfg) => {
    const appBundleId = cfg.ios?.bundleIdentifier;
    const configurations = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const buildConfig of Object.values(configurations)) {
      const settings = buildConfig?.buildSettings;
      const bundleId = String(settings?.PRODUCT_BUNDLE_IDENTIFIER ?? '').replace(/"/g, '');
      if (settings && bundleId !== appBundleId) {
        delete settings.ASSETCATALOG_COMPILER_APPICON_NAME;
      }
    }
    return cfg;
  });
};
