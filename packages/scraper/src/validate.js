function validate(root) {
  if (!Array.isArray(root)) throw new Error('Expected root to be an array');

  // Prefer using AJV for validation when available. Fall back to a
  // simple built-in validator if AJV is not installed or fails.
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
      // Fallback: perform the same permissive filtering as the AJV path
      // (log invalid items, keep valid ones). This ensures consistent
      // behavior whether AJV is installed or not.
      const valid = [];
      for (const it of root) {
        if (!it || typeof it !== 'object') {
          // eslint-disable-next-line no-console
          console.warn('Invalid item (not object):', it);
          continue;
        }
        if (typeof it.id !== 'string' || it.id.trim() === '') {
          // eslint-disable-next-line no-console
          console.warn('Invalid item (missing id):', it);
          continue;
        }
        if (typeof it.name !== 'string' || it.name.trim() === '') {
          // eslint-disable-next-line no-console
          console.warn('Invalid item (missing name):', it);
          continue;
        }
        valid.push(it);
      }
      if (valid.length === 0) throw new Error('No valid items after validation');
      return valid;
    }

    // propagate unexpected errors
    throw err;
  }
}

module.exports = validate;
