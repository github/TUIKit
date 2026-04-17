package main

import (
	"strings"
	"testing"

	"github.com/basiclines/tuikit/pkg/tuikit/tokens"
)

// TestSnapshotAllComponents is a table-driven smoke test that verifies every
// component and token listed in the registry renders without error via the
// snapshot code path. It mirrors the spec requirement:
// for each entry from --list, run --component <Name> --snapshot and assert
// exit 0 + non-empty output.
func TestSnapshotAllComponents(t *testing.T) {
	colors := tokens.ResolveColors(tokens.ModeDefault)

	for _, comp := range ComponentRegistry {
		t.Run(comp.Name, func(t *testing.T) {
			output := RenderSnapshot(comp.Name, "", colors, 80)
			if strings.TrimSpace(output) == "" {
				t.Errorf("snapshot for %q produced empty output", comp.Name)
			}
		})
	}
}

// TestSnapshotEachVariant ensures every individual variant also renders
// without error and produces non-empty output.
func TestSnapshotEachVariant(t *testing.T) {
	colors := tokens.ResolveColors(tokens.ModeDefault)

	for _, comp := range ComponentRegistry {
		for _, variant := range comp.Variants {
			name := comp.Name + "/" + variant
			t.Run(name, func(t *testing.T) {
				output := RenderSnapshot(comp.Name, variant, colors, 80)
				if strings.TrimSpace(output) == "" {
					t.Errorf("snapshot for %q variant %q produced empty output", comp.Name, variant)
				}
			})
		}
	}
}

// TestListOutput verifies that ComponentNames returns a non-empty list
// with tokens appearing before components.
func TestListOutput(t *testing.T) {
	names := ComponentNames()
	if len(names) == 0 {
		t.Fatal("ComponentNames() returned empty list")
	}

	// Tokens should come first (lowercase names)
	if names[0] != "breakpoints" {
		t.Errorf("expected first entry to be 'breakpoints', got %q", names[0])
	}

	// Components should follow (uppercase first letter)
	foundComponent := false
	for _, n := range names {
		if len(n) > 0 && n[0] >= 'A' && n[0] <= 'Z' {
			foundComponent = true
			break
		}
	}
	if !foundComponent {
		t.Error("expected at least one PascalCase component in the registry")
	}
}

// TestUnknownComponentError verifies that an unknown component name
// returns empty output from RenderSnapshot.
func TestUnknownComponentError(t *testing.T) {
	colors := tokens.ResolveColors(tokens.ModeDefault)
	output := RenderSnapshot("NonExistent", "", colors, 80)
	if output != "" {
		t.Errorf("expected empty output for unknown component, got %q", output)
	}
}

// TestVariantFilter verifies that --variant filters to a single variant.
func TestVariantFilter(t *testing.T) {
	colors := tokens.ResolveColors(tokens.ModeDefault)

	all := RenderSnapshot("Select", "", colors, 80)
	one := RenderSnapshot("Select", "Basic", colors, 80)

	if len(one) >= len(all) {
		t.Error("single variant output should be shorter than all variants")
	}
	if strings.TrimSpace(one) == "" {
		t.Error("single variant output should not be empty")
	}
}
