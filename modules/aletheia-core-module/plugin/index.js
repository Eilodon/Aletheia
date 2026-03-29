const fs = require("node:fs");
const path = require("node:path");
const {
  createRunOncePlugin,
  withDangerousMod,
  withSettingsGradle,
} = require("expo/config-plugins");

const PLUGIN_NAME = "with-aletheia-core-module";
const PLUGIN_VERSION = "0.0.1";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function emptyDir(dirPath) {
  ensureDir(dirPath);
  for (const entry of fs.readdirSync(dirPath)) {
    fs.rmSync(path.join(dirPath, entry), { recursive: true, force: true });
  }
}

function copyIfPresent(sourcePath, destinationPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  ensureDir(path.dirname(destinationPath));
  fs.cpSync(sourcePath, destinationPath, { recursive: true });
  return true;
}

function listFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function syncNativeStaging(projectRoot) {
  const moduleRoot = path.join(projectRoot, "modules", "aletheia-core-module");
  const stagingRoot = path.join(moduleRoot, ".native-staging");

  const iosSwiftSource = path.join(projectRoot, "generated", "uniffi", "swift");
  const androidKotlinSource = path.join(projectRoot, "generated", "uniffi", "kotlin");
  const iosArtifactsSource = path.join(projectRoot, "artifacts", "ios");
  const androidArtifactsSource = path.join(projectRoot, "artifacts", "android");

  const iosSwiftDest = path.join(stagingRoot, "ios", "uniffi");
  const androidKotlinDest = path.join(stagingRoot, "android", "uniffi");
  const iosArtifactsDest = path.join(stagingRoot, "ios", "artifacts");
  const androidJniLibsDest = path.join(moduleRoot, "android", "src", "main", "jniLibs");

  emptyDir(iosSwiftDest);
  emptyDir(androidKotlinDest);
  emptyDir(iosArtifactsDest);
  emptyDir(androidJniLibsDest);

  const copied = {
    iosSwift: copyIfPresent(iosSwiftSource, iosSwiftDest),
    androidKotlin: copyIfPresent(androidKotlinSource, androidKotlinDest),
    iosArtifacts: copyIfPresent(iosArtifactsSource, iosArtifactsDest),
    androidJniLibs: false,
  };

  const androidJniLibsSource = path.join(androidArtifactsSource, "jniLibs");
  if (copyIfPresent(androidJniLibsSource, androidJniLibsDest)) {
    copied.androidJniLibs = true;
  } else if (fs.existsSync(androidArtifactsSource)) {
    copied.androidJniLibs = copyIfPresent(androidArtifactsSource, androidJniLibsDest);
  }

  const manifestPath = path.join(stagingRoot, "manifest.json");
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        copied,
        paths: {
          iosSwiftDest: path.relative(projectRoot, iosSwiftDest),
          androidKotlinDest: path.relative(projectRoot, androidKotlinDest),
          iosArtifactsDest: path.relative(projectRoot, iosArtifactsDest),
          androidJniLibsDest: path.relative(projectRoot, androidJniLibsDest),
        },
        files: {
          iosSwift: listFiles(iosSwiftDest).map((file) => path.relative(projectRoot, file)),
          androidKotlin: listFiles(androidKotlinDest).map((file) => path.relative(projectRoot, file)),
          iosArtifacts: listFiles(iosArtifactsDest).map((file) => path.relative(projectRoot, file)),
          androidJniLibs: listFiles(androidJniLibsDest).map((file) => path.relative(projectRoot, file)),
        },
      },
      null,
      2,
    ),
  );
}

function withAletheiaCoreModule(config) {
  config = withSettingsGradle(config, (modConfig) => {
    const safeProjectName = (modConfig.slug || "aletheia-app")
      .replace(/[^A-Za-z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "") || "aletheia-app";

    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      /rootProject\.name = '.*'/,
      `rootProject.name = '${safeProjectName}'`,
    );

    return modConfig;
  });

  config = withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      syncNativeStaging(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);

  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      syncNativeStaging(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(
  withAletheiaCoreModule,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);
module.exports.default = module.exports;
module.exports.syncNativeStaging = syncNativeStaging;
