# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] 2026-01-14

### Added
- Import API requests from cURL.
- Random value generators for names and emails.
- Environment management functionality.
- Settings management with local storage integration.
- `ExMultiColorInput` component with syntax highlighting and custom styling.
- Collapse and expand functionality for API response lists.
- Database path management with UI integration.
- Spellcheck support in API settings inputs.
- Switched to portable mode with automatic migration of existing settings on first run.

### Changed
- Improved editor configuration and overall UI responsiveness.
- Updated `AppHeader` layout for better usability.
- Refined header priority handling.
- Simplified API settings and URI handling logic.
- Improved application reload behavior and startup stability.
- Updated application assets and icons.
- Upgraded Tauri to the latest version.
- Updated application versioning and initialization logic.

### Fixed
- Replaced incorrect action dropdown icon in API actions menu.
- Prevented invalid window positioning outside the screen.
- Fixed badge ordering and corrected license references.

### Refactored
- Reorganized codebase for better readability and maintainability.
- Simplified core application flow and removed obsolete code.
- Standardized imports and improved formatting across components.
- Cleaned up database and utility modules.

### Maintenance
- Updated dependencies and removed unused packages.
- Improved TypeScript and ESLint configuration.
- Standardized internal naming conventions.
- Merged long-running development branch.

---

## [0.2.0] 2026-01-01
- Initial commit.
