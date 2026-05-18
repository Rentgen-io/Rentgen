## 🚀 Release v1.21.0

### 🖥 Rentgen CLI (MVP Release)

Rentgen now works from the terminal.

You can export a `.rentgen` project from the desktop app and run API reality checks locally, inside Docker, or directly in CI/CD pipelines.

Main command:

- `rentgen xray`

Current MVP scope:

- folder / collection execution
- environment support
- Docker support
- CI/CD support
- JSON reports

Supported:

- GitHub Actions
- GitLab CI
- Bitbucket Pipelines
- Jenkins
- Docker

CLI page: https://rentgen.io/cli

Example:

```bash
rentgen xray ./project.rentgen \
 --collection="Smoke Tests" \
 --env=staging \
 --report=json
```

Docker:

```bash
docker run --rm -v "$PWD":/work -w /work \
 ghcr.io/rentgen-io/rentgen-cli:1.21.0 \
 xray ./project.rentgen
```

No cloud runners.
No hosted sync.
Same local-first philosophy.

---

### 🌍 Multi-language Support

Rentgen now supports multiple interface languages.

Supported languages:

- English
- Bahasa Indonesia
- Deutsch
- Español
- Français
- Italiano
- Lietuvių
- Nederlands
- Polski
- Português (Brasil)
- Русский
- Tiếng Việt
- Türkçe
- Українська
- हिन्दी
- ไทย
- 中文 (简体)
- 日本語
- 한국어

Found a translation issue or want to help add another language?

Open a GitHub issue with details and we will do our best.

---

### 🌐 New Field Type: IPv4

New supported field type:

- IPv4

Rentgen can now generate and validate IPv4-related test cases automatically.

---

### 🛠 Bug Fixes & Improvements

- Fixed variable editing issue where variables could only be created, not edited
- General CLI stability improvements
- UX improvements across project handling
- Performance optimizations
- Various internal fixes and cleanup
