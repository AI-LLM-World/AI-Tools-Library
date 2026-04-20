function validate(root) {
  if (!Array.isArray(root)) throw new Error('Expected root to be an array');

  // Prefer using AJV for validation when available. Fall back to the
  // simple built-in checks if AJV is not installed in the environment.
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Ajv = require('ajv');
    // Use strict mode and collect all errors so we fail fast on schema
    // violations including unknown properties.
    const ajv = new Ajv({ allErrors: true, strict: true });
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          short_description: { type: 'string' },
          website: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          example_use: { type: 'string' }
        },
        // Disallow unknown properties at the ingestion boundary.
        additionalProperties: false
      }
    };

    const validateAjv = ajv.compile(schema.items);
    const invalid = [];
    for (const it of root) {
      if (!validateAjv(it)) {
        invalid.push({ id: (it && it.id) || null, errors: validateAjv.errors });
      }
    }

    if (invalid.length > 0) {
      // Fail fast: do not silently drop items. Expose the first error for
      // operational triage. Callers can decide whether to keep previous data.
      // eslint-disable-next-line no-console
      console.error('Validation failed for', invalid.length, 'items; first errors=', invalid[0].errors);
      throw new Error('Validation failed for scraped items');
    }

    return root;
  } catch (err) {
    // If AJV isn't installed, fall back to the simple validator so the
    // scraper remains usable in minimal environments.
    if (err && err.code === 'MODULE_NOT_FOUND') {
      // Implement a strict fallback validator that also rejects unknown props
      const allowed = new Set(['id', 'name', 'category', 'short_description', 'website', 'tags', 'example_use']);
      for (const it of root) {
        if (!it || typeof it !== 'object') throw new Error('Each item must be an object');
        if (typeof it.id !== 'string' || it.id.trim() === '') throw new Error('Each item must have a string id');
        if (typeof it.name !== 'string' || it.name.trim() === '') throw new Error('Each item must have a string name');
        for (const k of Object.keys(it)) {
          if (!allowed.has(k)) throw new Error(`Unknown property '${k}' in item ${it.id || '<unknown>'}`);
        }
        if ('tags' in it && (!Array.isArray(it.tags) || it.tags.some((t) => typeof t !== 'string'))) {
          throw new Error('tags must be an array of strings');
        }
      }
      return root;
    }

    // propagate unexpected errors
    throw err;
  }
}

module.exports = validate;
