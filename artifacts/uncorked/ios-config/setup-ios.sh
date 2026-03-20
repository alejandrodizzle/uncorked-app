#!/bin/bash
# ─────────────────────────────────────────────────────────
# Uncorked — iOS Setup Script (run this on your Mac)
# ─────────────────────────────────────────────────────────
# Usage:
#   cd artifacts/uncorked
#   chmod +x ios-config/setup-ios.sh
#   ./ios-config/setup-ios.sh

set -e

echo ""
echo "🍷 Uncorked iOS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Install dependencies
echo "→ Installing dependencies..."
pnpm install

# 2. Build the web app
echo "→ Building web app..."
pnpm build

# 3. Add iOS platform (only needed once)
if [ ! -d "ios" ]; then
  echo "→ Adding iOS platform..."
  npx cap add ios
else
  echo "→ iOS platform already exists, skipping add..."
fi

# 4. Generate app icons and splash screens
echo "→ Generating app icons and splash screens..."
npx @capacitor/assets generate --ios

# 5. Inject Info.plist permissions
echo "→ Injecting camera and photo permissions into Info.plist..."
PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ]; then
  # Check if camera permission already added
  if ! grep -q "NSCameraUsageDescription" "$PLIST"; then
    # Insert permissions before the closing </dict></plist>
    PERMISSIONS='
	<key>NSCameraUsageDescription</key>
	<string>Uncorked needs camera access to scan wine labels and menus.</string>
	<key>NSPhotoLibraryUsageDescription</key>
	<string>Uncorked needs photo access to scan wine lists from your camera roll.</string>
	<key>NSPhotoLibraryAddUsageDescription</key>
	<string>Uncorked would like to save wine list scans to your photo library.</string>'
    # Use sed to insert before the last </dict>
    sed -i '' "s|</dict>$|${PERMISSIONS}\n</dict>|" "$PLIST"
    echo "   ✓ Permissions added to Info.plist"
  else
    echo "   ✓ Permissions already present in Info.plist"
  fi
else
  echo "   ⚠ Info.plist not found — add permissions manually using ios-config/Info.plist.additions.xml"
fi

# 6. Sync web build into native project
echo "→ Syncing into Xcode project..."
npx cap sync ios

# 7. Install CocoaPods
echo "→ Installing CocoaPods dependencies..."
cd ios/App && pod install && cd ../..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open Xcode:  npx cap open ios"
echo "  2. Select your Team in Signing & Capabilities"
echo "  3. Connect your iPhone and press ▶ Run to test"
echo "  4. To submit: Product → Archive → Distribute App"
echo ""
