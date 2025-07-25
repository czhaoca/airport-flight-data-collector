# Legacy Code

This directory contains the original implementation files that have been replaced by the new SOLID architecture.

## Files

- `collect_sfo_data.js` - Original SFO data collector
- `collect_yyz_data.js` - Original YYZ data collector  
- `utils.js` - Original utility functions

## Status

These files are preserved for reference but are no longer actively maintained. The new architecture provides:

- Better error handling
- Retry logic
- Pluggable storage backends
- Testable design
- Environment-based configuration

## Migration

To use the new architecture, see the [Migration Guide](../../docs/MIGRATION.md).

The main entry points (`src/collect_sfo_data.js` and `src/collect_yyz_data.js`) now act as compatibility wrappers that use the new architecture internally, ensuring backward compatibility with existing scripts and GitHub Actions.