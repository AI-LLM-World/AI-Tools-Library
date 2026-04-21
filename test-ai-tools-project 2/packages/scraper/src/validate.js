function validate(root) {
  if (!Array.isArray(root)) throw new Error('Expected root to be an array');

  // Prefer using AJV for validation when available. If AJV isn't available
  // or AJV compilation/validation fails, fall back to a small built-in
  // validator so scrapers remain usable in minimal environments.
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Ajv = require('ajv');
    const ajv = new Ajv({ allErrors: true, strict: false });
    const schemaItem = {
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
    };

    const validateAjv = ajv.compile(schemaItem);
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
    // If AJV isn't installed or AJV had runtime/compile errors, fall back to
    // a conservative simple validator. Log the AJV error to aid debugging.
    // eslint-disable-next-line no-console
    console.warn('AJV validation unavailable or failed; falling back to simple validator:', err && err.message);

    for (const it of root) {
      if (!it || typeof it !== 'object') throw new Error('Each item must be an object');
      if (typeof it.id !== 'string' || it.id.trim() === '') throw new Error('Each item must have a string id');
      if (typeof it.name !== 'string' || it.name.trim() === '') throw new Error('Each item must have a string name');
    }
    return root;
  }
}

module.exports = validate;
