# Exercise Timer - Distribution Guide

## For Your Friend (Easy Installation)

### Option 1: DMG Installer (Recommended)
1. Download the `excercise-timer_0.1.0_aarch64.dmg` file
2. Double-click the DMG file to mount it
3. Drag the "Exercise Timer" app to your Applications folder
4. Eject the DMG
5. Launch "Exercise Timer" from Applications or Spotlight

### Option 2: Direct App Bundle
1. Download the `excercise-timer.app` folder
2. Copy it to your Applications folder
3. Launch "Exercise Timer" from Applications or Spotlight

### Important Notes for macOS Security
- **First Launch**: macOS may show a security warning because the app isn't signed by a verified developer
- **If blocked**: Go to System Preferences → Security & Privacy → General, and click "Open Anyway" next to the Exercise Timer message
- **Alternative**: Right-click the app and select "Open" from the context menu

## What Your Friend Gets

✅ **Native macOS App**: Runs like any other Mac application  
✅ **No Installation Required**: Just drag and drop  
✅ **Offline Ready**: Works without internet connection  
✅ **Small Size**: Only ~6MB download  
✅ **Modern UI**: Beautiful macOS-native design with dark mode support  

## Distribution Files

Located in: `src-tauri/target/release/bundle/`

- **DMG**: `dmg/excercise-timer_0.1.0_aarch64.dmg` (6MB)
- **App Bundle**: `macos/excercise-timer.app/` (folder)

## Features Available

- ⏱️ Customizable work and rest intervals
- 🔄 Configurable number of rounds  
- 🏃‍♂️ Optional warm-up period
- 🔊 Audio notifications (ding sound)
- 📊 Progress tracking with visual indicators
- 🎨 Beautiful macOS-native interface
- 🌙 Automatic dark mode support
- ⚡ Preset workout configurations

## System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Architecture**: Apple Silicon (M1/M2/M3) or Intel
- **Disk Space**: 20MB free space

## Sharing Methods

### Cloud Storage
- Upload the DMG file to Google Drive, Dropbox, or iCloud
- Share the download link with your friend

### AirDrop (Local)
- Select the DMG file in Finder
- Use AirDrop to send directly to your friend's Mac

### Email (if small enough)
- The DMG is only 6MB, so it can be emailed directly

### File Transfer Services
- Use WeTransfer, SendAnywhere, or similar services

## Troubleshooting

### "App is damaged and can't be opened"
This happens due to macOS security features:
```bash
# Your friend can run this in Terminal:
xattr -cr /Applications/excercise-timer.app
```

### "Developer cannot be verified"
- Right-click the app → Open
- Click "Open" in the security dialog
- Or go to System Preferences → Security & Privacy → Click "Open Anyway"

### App won't launch
- Make sure it's in the Applications folder
- Try restarting the Mac
- Check System Preferences → Security & Privacy for blocks

## For Developers

### Build Requirements
- Node.js 16+
- Rust (latest stable)
- Tauri CLI v2
- macOS development environment

### Build Commands
```bash
npm run build          # Build frontend
npm run tauri build   # Create distribution bundles
```

### Build Artifacts
- Release binary: `src-tauri/target/release/excercise-timer`
- App bundle: `src-tauri/target/release/bundle/macos/excercise-timer.app`
- DMG installer: `src-tauri/target/release/bundle/dmg/excercise-timer_0.1.0_aarch64.dmg` 