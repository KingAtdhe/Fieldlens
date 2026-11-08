"""Point the generated Android project's release build at the upload keystore.

Run after `expo prebuild`, before gradle. Reads keystore details from gradle.properties
(FIELDLENS_UPLOAD_*), which CI writes from repository secrets.
"""
import re
import sys

path = "android/app/build.gradle"
s = open(path).read()

if "signingConfigs.release" in s:
    print("release signing already configured")
    sys.exit(0)

release_block = """signingConfigs {
        release {
            if (project.hasProperty('FIELDLENS_UPLOAD_STORE_FILE')) {
                storeFile file(FIELDLENS_UPLOAD_STORE_FILE)
                storePassword FIELDLENS_UPLOAD_STORE_PASSWORD
                keyAlias FIELDLENS_UPLOAD_KEY_ALIAS
                keyPassword FIELDLENS_UPLOAD_KEY_PASSWORD
            }
        }
        debug {"""

s, n1 = re.subn(r"signingConfigs \{\s*\n\s*debug \{", release_block, s, count=1)
s, n2 = re.subn(
    r"(buildTypes \{.*?release \{.*?)signingConfig signingConfigs\.debug",
    r"\1signingConfig signingConfigs.release",
    s,
    count=1,
    flags=re.S,
)
if not (n1 and n2):
    print("could not patch build.gradle", n1, n2)
    sys.exit(1)
open(path, "w").write(s)
print("release signing configured")
