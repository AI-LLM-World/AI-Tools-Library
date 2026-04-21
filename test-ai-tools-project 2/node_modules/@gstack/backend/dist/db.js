"use strict";
// Lightweight wrapper that re-exports the shared DB implementation
// located at packages/backend/src/db.ts in the monorepo root. This
// indirection keeps the worktree runnable while centralizing DB code.
module.exports = require('../../../../packages/backend/src/db').default;
