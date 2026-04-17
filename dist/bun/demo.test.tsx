import { describe, test, expect } from "bun:test";
import { execFileSync } from "child_process";
import path from "path";

const DEMO_PATH = path.join(import.meta.dir, "demo.tsx");

function runDemo(...args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("bun", ["run", DEMO_PATH, ...args], {
      encoding: "utf-8",
      timeout: 15_000,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? "", exitCode: err.status ?? 1 };
  }
}

describe("demo CLI", () => {
  test("--list prints all component names and exits 0", () => {
    const { stdout, exitCode } = runDemo("--list");
    expect(exitCode).toBe(0);
    const names = stdout.trim().split("\n");
    expect(names.length).toBeGreaterThanOrEqual(10);
    // tokens first, lowercase
    expect(names[0]).toBe("breakpoints");
    expect(names[1]).toBe("colors");
    expect(names[2]).toBe("icons");
    // components follow
    expect(names).toContain("Dialog");
    expect(names).toContain("Select");
    expect(names).toContain("TextTitle");
  });

  test("--component with unknown name exits 1", () => {
    const { exitCode } = runDemo("--component", "DoesNotExist", "--snapshot");
    expect(exitCode).toBe(1);
  });

  test("--variant with unknown variant exits 1", () => {
    const { exitCode } = runDemo("--component", "HintBar", "--variant", "NoSuchVariant", "--snapshot");
    expect(exitCode).toBe(1);
  });

  test("--snapshot without --component exits 1", () => {
    const { exitCode } = runDemo("--snapshot");
    expect(exitCode).toBe(1);
  });
});

describe("demo smoke tests", () => {
  const { stdout: listOutput } = runDemo("--list");
  const componentNames = listOutput.trim().split("\n").filter(Boolean);

  test.each(componentNames)("--component %s --snapshot renders without error", (name) => {
    const { stdout, exitCode } = runDemo("--component", name, "--snapshot");
    expect(exitCode).toBe(0);
    expect(stdout.trim().length).toBeGreaterThan(0);
  });
});
