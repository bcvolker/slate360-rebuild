#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Sets PRODUCT_BUNDLE_IDENTIFIER (+ app icon) on the App target for a
# non-default APP_VARIANT build, BEFORE code signing runs.
#
# Why this has to happen here and not via --archive-xcargs alone: Codemagic's
# `xcode-project use-profiles` step resolves and writes the provisioning
# profile assignment based on the project file's OWN declared bundle id at
# the time it runs. An archive-time-only override (xcodebuild ...
# PRODUCT_BUNDLE_IDENTIFIER=...) changes what gets COMPILED but not what
# use-profiles already matched a profile against, so a fetched profile for
# the new bundle id never gets attached to the target ->
# "requires a provisioning profile" at archive time even though signing
# setup reported success. Mutating the pbxproj's own build setting before
# `xcode-project use-profiles` runs (see codemagic.yaml sitewalk360-ios)
# makes the automatic profile-matching find and assign the right profile.
#
# Usage: APP_BUNDLE_ID=com.slate360.sitewalk360 APP_ICON_NAME=AppIcon-SW360 \
#          ruby scripts/ios/set-bundle-variant.rb
# Requires: gem install xcodeproj
require "xcodeproj"

PROJECT_PATH = "ios/App/App.xcodeproj"
TARGET_NAME  = "App"

bundle_id = ENV["APP_BUNDLE_ID"]
icon_name = ENV["APP_ICON_NAME"]
raise "APP_BUNDLE_ID is required" if bundle_id.nil? || bundle_id.empty?

project = Xcodeproj::Project.open(PROJECT_PATH)
target  = project.targets.find { |t| t.name == TARGET_NAME }
raise "Target '#{TARGET_NAME}' not found in #{PROJECT_PATH}" unless target

target.build_configurations.each do |config|
  config.build_settings["PRODUCT_BUNDLE_IDENTIFIER"] = bundle_id
  config.build_settings["ASSETCATALOG_COMPILER_APPICON_NAME"] = icon_name if icon_name && !icon_name.empty?
  puts "  #{config.name}: PRODUCT_BUNDLE_IDENTIFIER=#{bundle_id}" \
       "#{icon_name && !icon_name.empty? ? ", ASSETCATALOG_COMPILER_APPICON_NAME=#{icon_name}" : ''}"
end

project.save
puts "Saved #{PROJECT_PATH} with bundle id #{bundle_id}"
