import { readFileSync, writeFileSync } from "node:fs";

const buildGradlePath = "android/app/build.gradle";
const buildGradle = readFileSync(buildGradlePath, "utf8");

const signingConfigBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const releaseSigningConfigBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (findProperty('MEMORAID_UPLOAD_STORE_FILE')) {
                storeFile file(findProperty('MEMORAID_UPLOAD_STORE_FILE'))
                storePassword findProperty('MEMORAID_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('MEMORAID_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('MEMORAID_UPLOAD_KEY_PASSWORD')
            }
        }
    }`;

if (!buildGradle.includes(signingConfigBlock)) {
  throw new Error("Expected Expo prebuild signing config block was not found in android/app/build.gradle");
}

const withReleaseSigningConfig = buildGradle.replace(signingConfigBlock, releaseSigningConfigBlock);
const withReleaseBuildType = withReleaseSigningConfig.replace(
  "            signingConfig signingConfigs.debug",
  "            signingConfig signingConfigs.release",
);

if (withReleaseSigningConfig === buildGradle || withReleaseBuildType === withReleaseSigningConfig) {
  throw new Error("Failed to update release signing configuration in android/app/build.gradle");
}

writeFileSync(buildGradlePath, withReleaseBuildType);
