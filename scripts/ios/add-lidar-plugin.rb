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

PROJECT_PATH = "ios/App/App.xcodeproj"
TARGET_NAME  = "App"
FILES = %w[LiDARCapturePlugin.swift LiDARCapturePlugin.m].freeze

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

if changed
  project.save
  puts "Saved #{PROJECT_PATH}"
else
  puts "No changes needed — LiDAR files already registered in #{PROJECT_PATH}"
end
