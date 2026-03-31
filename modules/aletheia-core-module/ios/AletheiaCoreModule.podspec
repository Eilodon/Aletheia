require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'AletheiaCoreModule'
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.license = package['license']
  s.platforms = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.swift_version = '5.9'
  s.source = { git: 'https://example.invalid/aletheia.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = 'AletheiaCoreModule.swift'
end
