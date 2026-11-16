fn main() {
    println!("cargo:rerun-if-changed=src/macos_updates.m");
    println!("cargo:rerun-if-env-changed=SPARKLE_DIR");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("macos") {
        return;
    }

    let mut build = cc::Build::new();
    build.file("src/macos_updates.m").flag("-fobjc-arc");
    if std::env::var_os("CARGO_FEATURE_UPDATER").is_some() {
        let sdk = std::env::var("SPARKLE_DIR")
            .expect("updater requires SPARKLE_DIR; use scripts/build-macos.sh --updater");
        let sdk = std::fs::canonicalize(sdk).expect("SPARKLE_DIR must exist");
        assert!(
            sdk.join("Sparkle.framework").is_dir(),
            "Sparkle.framework missing"
        );
        build
            .define("ET_SPARKLE", None)
            .flag(format!("-F{}", sdk.display()));
        println!("cargo:rustc-link-search=framework={}", sdk.display());
        println!("cargo:rustc-link-lib=framework=Sparkle");
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
    }
    build.compile("macos_updates");
    println!("cargo:rustc-link-lib=framework=AppKit");
}
