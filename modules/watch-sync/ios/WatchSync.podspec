Pod::Spec.new do |s|
  s.name           = 'WatchSync'
  s.version        = '1.0.0'
  s.summary        = 'Envía la sesión de VICA al Apple Watch'
  s.description    = 'Pasa el token y la URL del API a la app del reloj con WatchConnectivity'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WatchConnectivity'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
