const { writeFileSync } = require('fs')
const path = require('path')

// Minimal token css generator for the scaffold. Teams should replace with proper build.
const tokens = {
  color: {
    'primary-default': '#0ea5a4',
    'primary-contrast': '#ffffff'
  }
}

let css = ':root {\n'
for (const [k, v] of Object.entries(tokens.color)) {
  css += `  --gstack-color-${k}: ${v};\n`
}
css += '}'

const out = path.join(__dirname, '..', 'packages', 'tokens', 'dist')
try {
  require('fs').mkdirSync(out, { recursive: true })
  writeFileSync(path.join(out, 'tokens.css'), css)
  writeFileSync(path.join(out, 'tokens.json'), JSON.stringify(tokens, null, 2))
  console.log('tokens generated to', out)
} catch (err) {
  console.error(err)
  process.exit(1)
}
