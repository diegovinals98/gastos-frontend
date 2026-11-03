const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// Xcode 27 solo acepta deployment targets >= 15.0. Algunos pods (react-native-maps,
// AsyncStorage) declaran 11.0 / 13.4 en sus bundles de recursos y rompen la build.
// Subimos a 15.1 (el mínimo de la app) los que estén por debajo.
const MIN_TARGET = '15.1';
const MARKER = '# withPodsMinDeploymentTarget';

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        current = c.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN_TARGET}')
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'
        end
      end
    end`;

module.exports = function withPodsMinDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');
      if (!podfile.includes(MARKER)) {
        podfile = podfile.replace(/post_install do \|installer\|\n/, (match) => match + SNIPPET + '\n');
        fs.writeFileSync(podfilePath, podfile);
      }
      return cfg;
    },
  ]);
};
