# Developer ID signing and notarization

The packaging script supports distribution outside the Mac App Store. Public releases require your Apple Developer credentials; they are not included in this repository. Local builds use an ad-hoc signature and remain unnotarized.

## This Mac

The local `.signing.local` file contains the selected Developer ID identity, Keychain profile name, and explicit Keychain path, with no password. It is ignored by Git. After storing notarization credentials, release from the repository root with:

```sh
source .signing.local
scripts/build-macos.sh --universal --notarize
```

Verify that the certificate and authentication are ready without displaying credentials:

```sh
security find-identity -v -p codesigning
source .signing.local
xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" --keychain "$NOTARY_KEYCHAIN"
```

The interactive setup helper in `dist/signing/Store-Notarization-Credentials.command` supplies this Mac's account and team ID. Open it in Terminal and enter the app-specific password only at its secure prompt. The helper and downloaded certificates are local, ignored build artifacts.

For another Mac or CI, set `NOTARY_KEYCHAIN` when credentials are stored in a specific Keychain. The build script validates access to the profile before building whenever `--notarize` is requested.

## One-time setup

1. Install a **Developer ID Application** certificate and its private key in your login Keychain.
2. Verify its exact name with `security find-identity -v -p codesigning`.
3. Store notarization credentials interactively in Keychain:

```sh
xcrun notarytool store-credentials exercise-timer-notary
```

Follow the prompts for your Apple ID, team ID, and app-specific password, or use the API-key flow documented by Apple. Do not commit credentials or put them in build scripts.

If the identity is present but not valid, check its certificate chain. Certificates issued by Developer ID G2 need Apple's [Developer ID G2 intermediate certificate](https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer). Import that intermediate into Keychain without overriding trust settings.

Keep a password-protected backup of the certificate **and its private key**, exported together as a `.p12` from Keychain Access. A downloaded `.cer` contains only the public certificate and cannot restore signing on another Mac by itself. Keep this backup outside the repository.

## Build a release

```sh
SIGNING_IDENTITY='Developer ID Application: Your Name (TEAMID)' \
NOTARY_PROFILE='exercise-timer-notary' \
scripts/build-macos.sh --universal --notarize
```

The script enables the hardened runtime, timestamps the Developer ID signature, verifies the bundle, uploads an app ZIP with `notarytool`, checks that its status is `Accepted`, staples the app, and checks Gatekeeper. It then creates the distributable ZIP and DMG, signs/notarizes/staples the DMG, and generates SHA-256 checksums. No permissive runtime entitlements are requested.

If a submission fails, use its ID from `dist/macos/universal/notarization-*.json`:

```sh
xcrun notarytool log SUBMISSION_ID --keychain-profile exercise-timer-notary
```

Never modify bundle contents after signing. Rebuild and notarize each new release. The script replaces matching versioned outputs only after successful verification; older artifacts may remain in the output directory, so select the intended version when uploading.

## Final verification

```sh
codesign --verify --strict --verbose=2 'dist/macos/universal/Exercise Timer.app'
xcrun stapler validate 'dist/macos/universal/Exercise Timer.app'
spctl --assess --type execute --verbose=2 'dist/macos/universal/Exercise Timer.app'
```

Also validate the DMG ticket and test a downloaded copy on another Mac. An accepted notarization is not an App Store submission.

References: [Apple: Developer ID](https://developer.apple.com/developer-id/), [Notarizing macOS software](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution), [Customizing the notarization workflow](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow).
