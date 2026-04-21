// Minimal token build script placeholder for Phase 5
// Generates dist/tokens.json and dist/tokens.css from an inline schema.
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'packages', 'tokens', 'dist')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const tokens = {
  color: {
    background: { base: '#ffffff', muted: '#f7f7f8' },
    text: { primary: '#0f1722', muted: '#6b7280' },
    primary: { default: '#0ea5a4', contrast: '#ffffff' }
  },
  spacing: { '1': '4px', '2': '8px', '3': '12px', '4': '16px' },
  radius: { sm: '4px', md: '8px', lg: '12px' }
}

fs.writeFileSync(path.join(outDir, 'tokens.json'), JSON.stringify(tokens, null, 2))

// Emit CSS variables
let css = ':root {\n'
function walk(obj, prefix = '') {
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (typeof val === 'object') walk(val, `${prefix}-${key}`)
    else css += `  --gstack${prefix}-${key}: ${val};\n`
  }
}
walk(tokens, '')
css += '}\n'
fs.writeFileSync(path.join(outDir, 'tokens.css'), css)

console.log('Wrote tokens to', outDir)
