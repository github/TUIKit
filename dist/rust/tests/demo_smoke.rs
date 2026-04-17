//! Demo smoke tests — verify every component renders via --snapshot without errors.

use std::path::Path;
use std::process::Command;

fn demo_binary() -> std::path::PathBuf {
    // Build the demo binary once
    let status = Command::new(env!("CARGO"))
        .args(["build", "--example", "demo"])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .status()
        .expect("failed to build demo");
    assert!(status.success(), "demo build failed");

    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("target")
        .join("debug")
        .join("examples")
        .join("demo")
}

#[test]
fn list_returns_all_components() {
    let bin = demo_binary();
    let output = Command::new(&bin)
        .arg("--list")
        .output()
        .expect("failed to run --list");
    assert!(output.status.success(), "--list failed");

    let stdout = String::from_utf8(output.stdout).unwrap();
    let names: Vec<&str> = stdout.lines().filter(|l| !l.is_empty()).collect();

    // Tokens (lowercase) + components (PascalCase) = 19
    assert!(
        names.len() >= 19,
        "expected at least 19 entries, got {}: {:?}",
        names.len(),
        names
    );
    // Spot-check tokens
    assert!(names.contains(&"breakpoints"), "missing breakpoints");
    assert!(names.contains(&"colors"), "missing colors");
    assert!(names.contains(&"icons"), "missing icons");
    // Spot-check components
    assert!(names.contains(&"Select"), "missing Select");
    assert!(names.contains(&"Dialog"), "missing Dialog");
    assert!(names.contains(&"SelectAutocomplete"), "missing SelectAutocomplete");
}

#[test]
fn snapshot_all_components_exit_0_with_output() {
    let bin = demo_binary();

    // Get the list of all component/token names
    let list_out = Command::new(&bin)
        .arg("--list")
        .output()
        .expect("failed to run --list");
    assert!(list_out.status.success());

    let stdout = String::from_utf8(list_out.stdout).unwrap();
    let names: Vec<&str> = stdout.lines().filter(|l| !l.is_empty()).collect();
    assert!(!names.is_empty(), "--list returned no components");

    // Snapshot each component and verify exit 0 + non-empty output
    for name in &names {
        let snap = Command::new(&bin)
            .args(["--component", name, "--snapshot"])
            .output()
            .unwrap_or_else(|e| panic!("failed to run snapshot for {}: {}", name, e));

        assert!(
            snap.status.success(),
            "'{}' snapshot failed (exit {}): {}",
            name,
            snap.status,
            String::from_utf8_lossy(&snap.stderr)
        );
        assert!(
            !snap.stdout.is_empty(),
            "'{}' snapshot produced no output",
            name
        );
    }
}

#[test]
fn unknown_component_exits_with_error() {
    let bin = demo_binary();
    let output = Command::new(&bin)
        .args(["--component", "NonExistentComponent", "--snapshot"])
        .output()
        .expect("failed to run demo");
    assert!(
        !output.status.success(),
        "expected non-zero exit for unknown component"
    );
}

#[test]
fn unknown_variant_exits_with_error() {
    let bin = demo_binary();
    let output = Command::new(&bin)
        .args(["--component", "Select", "--variant", "NoSuchVariant", "--snapshot"])
        .output()
        .expect("failed to run demo");
    assert!(
        !output.status.success(),
        "expected non-zero exit for unknown variant"
    );
}
