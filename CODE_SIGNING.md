# Code Signing Guide (Optional Enhancement)

## Current Status
✅ **App builds and runs perfectly**  
⚠️ **Not code signed** - Users will see security warnings on first launch  

## Why Code Signing Matters
- Eliminates "Developer cannot be verified" warnings
- Builds user trust and confidence
- Required for Mac App Store distribution
- Enables automatic updates through app stores

## How to Add Code Signing (Future Enhancement)

### 1. Get Apple Developer Account
- Sign up at [developer.apple.com](https://developer.apple.com)
- Cost: $99/year for individuals

### 2. Create Certificates
- Developer ID Application Certificate (for distribution outside App Store)
- Developer ID Installer Certificate (for pkg installers)

### 3. Update Tauri Configuration
Add to `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "macOS": {
      "signing": {
        "identity": "Developer ID Application: Your Name (TEAM_ID)"
      }
    }
  }
}
```

### 4. Build with Signing
```bash
npm run tauri build
```

### 5. Notarization (Recommended)
- Upload to Apple for notarization
- Eliminates all security warnings
- Automatic with Xcode or altool

## Current Workaround for Users
Since the app isn't signed, users need to:
1. Right-click the app → "Open"
2. Click "Open" in the security dialog
3. Or use System Preferences → Security & Privacy → "Open Anyway"

## Alternative: Self-Signing (Free)
For development/testing purposes:
```bash
# Create self-signed certificate
codesign --force --deep --sign - excercise-timer.app
```

⚠️ **Note**: Self-signing still shows warnings but may be slightly better than unsigned.

## Is Code Signing Required?
**No** - Your app works perfectly without it. Code signing is purely for:
- Professional distribution
- Eliminating user friction
- App Store submission

For friend-to-friend sharing, the current unsigned build is completely fine! 