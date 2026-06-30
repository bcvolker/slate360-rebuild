#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Registers LiDARCapturePlugin.swift and .m in the Xcode project so
# Codemagic CI can compile them without manual Xcode steps.
#
# Usage: ruby scripts/ios/add-lidar-plugin.rb
# Requires: gem install xcodeproj
#
require "xcodeproj"
require "json"

PROJECT_PATH = "ios/App/App.xcodeproj"
TARGET_NAME  = "App"
FILES = %w[
  LiDARCapturePlugin.swift
  LiDARCapturePlugin.m
  TwinARKitCaptureViewController.swift
  TwinUploader.swift
  SlateBridgeViewController.swift
  TwinCaptureHudHost.swift
  TwinCaptureHudView.swift
  TwinHudStateModel.swift
  TwinCaptureChromeMetrics.swift
].freeze

# Frameworks the native capture uses. ARKit is always linked below; these are
# linked explicitly too because Swift implicit autolink can silently fail on
# some Xcode/Codemagic combinations.
EXTRA_FRAMEWORKS = %w[AVFoundation.framework CoreLocation.framework SceneKit.framework].freeze

project = Xcodeproj::Project.open(PROJECT_PATH)
target  = project.targets.find { |t| t.name == TARGET_NAME }
raise "Target '#{TARGET_NAME}' not found in #{PROJECT_PATH}" unless target

# Find or create the group hierarchy (App/Plugins/LiDARCapture).
# find_subpath creates intermediate groups as needed.
app_group     = project.main_group.find_subpath("App", true)
plugins_group = app_group.find_subpath("Plugins", true)
lidar_group   = plugins_group.find_subpath("LiDARCapture", true)

changed = false

FILES.each do |filename|
  # Skip if file reference already present in this group.
  next if lidar_group.files.any? { |f| f.path == filename }

  file_ref = lidar_group.new_file(filename)

  unless target.source_build_phase.files_references.include?(file_ref)
    target.source_build_phase.add_file_reference(file_ref)
    puts "  Added #{filename} to Compile Sources"
    changed = true
  end
end

# ARKit is imported by LiDARCapturePlugin.swift — link explicitly so CI
# does not rely on Swift's implicit framework autolink, which can silently
# fail on some Xcode/Codemagic version combinations.
arkit_linked = target.frameworks_build_phase.files.any? do |bf|
  bf.file_ref&.path&.end_with?("ARKit.framework")
end
unless arkit_linked
  arkit_ref = project.frameworks_group.files.find { |f| f.path == "ARKit.framework" } ||
              project.frameworks_group.new_file("ARKit.framework")
  target.frameworks_build_phase.add_file_reference(arkit_ref)
  puts "  Linked ARKit.framework"
  changed = true
end

EXTRA_FRAMEWORKS.each do |fw|
  linked = target.frameworks_build_phase.files.any? { |bf| bf.file_ref&.path&.end_with?(fw) }
  next if linked
  ref = project.frameworks_group.files.find { |f| f.path == fw } ||
        project.frameworks_group.new_file(fw)
  target.frameworks_build_phase.add_file_reference(ref)
  puts "  Linked #{fw}"
  changed = true
end

if changed
  project.save
  puts "Saved #{PROJECT_PATH}"
else
  puts "No changes needed — LiDAR files already registered in #{PROJECT_PATH}"
end

# Capacitor 8 auto-registers iOS plugins listed in the GENERATED
# ios/App/App/capacitor.config.json `packageClassList`. `npx cap sync ios` only
# writes the npm plugins there (StatusBarPlugin, etc.) — it never sees our
# app-target plugin. Without this entry the bridge never registers LiDARCapture,
# so no PluginHeader is exported and JS throws "plugin is not implemented on ios".
# This step (run AFTER cap sync in CI) appends our class so the bridge discovers
# it at init via NSClassFromString("LiDARCapturePlugin") — same path the official
# plugins use. The class is @objc(LiDARCapturePlugin) and compiled into the App
# target above, so the lookup resolves.
PLUGIN_CLASS = "LiDARCapturePlugin"
config_path = "ios/App/App/capacitor.config.json"
if File.exist?(config_path)
  cfg = JSON.parse(File.read(config_path))
  list = cfg["packageClassList"]
  list = cfg["packageClassList"] = [] unless list.is_a?(Array)
  if list.include?(PLUGIN_CLASS)
    puts "  packageClassList already includes #{PLUGIN_CLASS}"
  else
    list << PLUGIN_CLASS
    File.write(config_path, "#{JSON.pretty_generate(cfg)}\n")
    puts "  Added #{PLUGIN_CLASS} to packageClassList in #{config_path}"
  end
else
  puts "  WARNING: #{config_path} not found — run after `npx cap sync ios`"
end
