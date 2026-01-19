# Querying Certificate List

```
security find-identity -v -p codesigning
```
# Verifying IMG

Verify if the IMG is signed with a certificate:
```
spctl -a -v src-tauri/target/release/bundle/dmg/cyberapi_0.1.0_aarch64.dmg
```

# Version Release

After modifying the version number, execute `make version` to generate the change log, then commit the code and merge it to the release branch.