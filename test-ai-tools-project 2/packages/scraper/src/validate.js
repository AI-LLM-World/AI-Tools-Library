function validate(root) {
  if (!Array.isArray(root)) throw new Error('Expected root to be an array');

  // Prefer using AJV for validation when available. Instead of failing the
  // whole batch on the first invalid item we validate per-item and return a
  // filtered array of valid items. If every item is invalid we throw to
  // avoid writing an empty dataset.
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Ajv = require('ajv');
    // Use strict mode and collect all errors so we can report per-item issues.
    const ajv = new Ajv({ allErrors: true, strict: true });
    const itemSchema = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        category: { type: 'string' },
        short_description: { type: 'string' },
        website: { type: 'string' },
        url: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        example_use: { type: 'string' }
      },
      // Disallow unknown properties at the ingestion boundary.
      additionalProperties: false
    };

    const validateAjv = ajv.compile(itemSchema);
    const valid = [];
    const invalid = [];

    for (const it of root) {
      if (validateAjv(it)) {
        valid.push(it);
      } else {
        invalid.push({ id: (it && it.id) || null, errors: validateAjv.errors });
      }
    }

    if (invalid.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Validation: dropped', invalid.length, 'invalid items; first errors=', invalid[0].errors);
    }

    if (valid.length === 0) {
      throw new Error('Validation failed: no valid items in scraped payload');
    }

    return valid;
  } catch (err) {
    // If AJV isn't installed, fall back to a strict per-item validator so the
    // scraper remains usable in minimal environments.
    if (err && err.code === 'MODULE_NOT_FOUND') {
      const allowed = new Set(['id', 'name', 'category', 'short_description', 'website', 'url', 'tags', 'example_use']);
      const valid = [];
      const invalid = [];

      for (const it of root) {
        if (!it || typeof it !== 'object') {
          invalid.push({ id: null, reason: 'not an object' });
          continue;
        }
        if (typeof it.id !== 'string' || it.id.trim() === '') {
          invalid.push({ id: (it && it.id) || null, reason: 'missing id' });
          continue;
        }
        if (typeof it.name !== 'string' || it.name.trim() === '') {
          invalid.push({ id: it.id || null, reason: 'missing name' });
          continue;
        }

        let ok = true;
        for (const k of Object.keys(it)) {
          if (!allowed.has(k)) {
            ok = false;
            invalid.push({ id: it.id || null, reason: `unknown property '${k}'` });
            break;
          }
        }
        if (!ok) continue;
        if ('tags' in it && (!Array.isArray(it.tags) || it.tags.some((t) => typeof t !== 'string'))) {
          invalid.push({ id: it.id || null, reason: 'tags must be an array of strings' });
          continue;
        }

        valid.push(it);
      }

      if (invalid.length > 0) {
        // eslint-disable-next-line no-console
        console.error('Validation fallback: dropped', invalid.length, 'invalid items; first=', invalid[0]);
      }

      if (valid.length === 0) throw new Error('Validation failed: no valid items in scraped payload');
      return valid;
    }

    // propagate unexpected errors
    throw err;
  }
}

module.exports = validate;
