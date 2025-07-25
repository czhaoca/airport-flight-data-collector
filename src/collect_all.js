#!/usr/bin/env node

/**
 * Backward compatibility wrapper for collecting all airports
 * Uses the new SOLID architecture internally
 */
const { main } = require('./application/commands/collect');

// Run collection for all airports
main();