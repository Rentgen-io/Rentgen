## 🚀 Release v1.22.0

This release introduces persistent project configuration and makes Rentgen significantly more configurable for real-world API testing.

---

### 💾 Persistent Project Configuration

All project configuration is now saved inside the `.rentgen` project.

This includes:

- field mappings
- expected results
- ignored tests

Everything is automatically restored after reopening the project.

When you export a project and share it with teammates, the entire configuration travels with it.

No more repeating the same setup.

---

### ⚙️ Configurable Security Checks

Every security check can now be enabled or ignored individually.

Typical workflow:

- run all security tests
- review findings
- decide which ones are relevant
- ignore the rest with a single click

Ignored checks are always visible in the statistics and can be re-enabled at any time from **Settings**.

---

### 🎯 Configurable Expected Results

Data-driven tests are no longer fixed.

If Rentgen expects a request to fail but your API intentionally accepts it (or vice versa), simply change the expected result directly from the UI.

Supported expectations:

- 2xx
- 4xx

All custom expectations are stored inside the project and shared with your team, providing a single source of truth.

---

### 🛠 Bug Fixes & Improvements

- UX improvements across the application
- Various bug fixes
- Performance optimizations
- General stability improvements
