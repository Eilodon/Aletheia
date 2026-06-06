import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const engineSource = () =>
  readFileSync(
    "modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/LocalInferenceEngine.kt",
    "utf8",
  );

const moduleSource = () =>
  readFileSync(
    "modules/aletheia-core-module/android/src/main/java/expo/modules/aletheiacore/AletheiaCoreModule.kt",
    "utf8",
  );

describe("Android local model ops source guards", () => {
  it("uses one 95 percent readiness threshold for existing and downloaded model files", () => {
    const source = engineSource();

    expect(source).toContain("MIN_READY_MODEL_BYTES");
    expect(source).not.toContain("EXPECTED_MODEL_SIZE * 90 / 100");
    expect(source).toContain("modelFile.length() >= MIN_READY_MODEL_BYTES");
    expect(source).toContain("tempFile.length() < MIN_READY_MODEL_BYTES");
  });

  it("validates atomic rename before writing model version", () => {
    const source = engineSource();

    expect(source).toContain("if (!tempFile.renameTo(modelFile))");
    expect(source.indexOf("if (!tempFile.renameTo(modelFile))")).toBeLessThan(
      source.indexOf("writeText(version)"),
    );
  });

  it("does not treat any non-empty model file as already prepared", () => {
    const source = moduleSource();

    expect(source).not.toContain("downloadManager.getModelSize() > 0");
    expect(source).toContain("downloadManager.hasCompleteModel()");
  });

  it("resumes interrupted downloads with HTTP range and append mode", () => {
    const source = engineSource();

    expect(source).toContain("Range");
    expect(source).toContain("bytes=$existingBytes-");
    expect(source).toContain("FileOutputStream(tempFile, true)");
    expect(source).toContain("HTTP 206");
  });
});
