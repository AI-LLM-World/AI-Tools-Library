function validate(root) {
  if (!Array.isArray(root)) throw new Error('Expected root to be an array');

  // Prefer using AJV for validation when available. Fall back to the
  // simple built-in checks if AJV is not installed in the environment.
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Ajv = require('ajv');
    const ajv = new Ajv({ allErrors: true, strict: false });
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
        additionalProperties: true
      }
    };

    const validateAjv = ajv.compile(schema.items);
    const valid = [];
    for (const it of root) {
      if (validateAjv(it)) {
        valid.push(it);
      } else {
        // best-effort logging for invalid items; do not crash entire run
        // eslint-disable-next-line no-console
        console.warn('Validation failed for item id=', it && it.id, validateAjv.errors);
      }
    }

    if (valid.length === 0) throw new Error('No valid items after validation');
    return valid;
  } catch (err) {
    // If AJV isn't installed, fall back to the simple validator so the
    // scraper remains usable in minimal environments.
    if (err && err.code === 'MODULE_NOT_FOUND') {
      for (const it of root) {
        if (!it || typeof it !== 'object') throw new Error('Each item must be an object');
        if (typeof it.id !== 'string' || it.id.trim() === '') throw new Error('Each item must have a string id');
        if (typeof it.name !== 'string' || it.name.trim() === '') throw new Error('Each item must have a string name');
      }
      return root;
    }

    // propagate unexpected errors
    throw err;
  }
}

module.exports = validate;
