const fs = require('fs')
const path = require('path')
const esprima = require('esprima')
const escodegen = require('escodegen')

const format = {
  compact: true,
  semicolons: true
}

const importPath = path.join(__dirname, '/include/')

const core = fs.readFileSync(importPath + 'core.js', 'utf8') + '\n'
const nodeCore =
  core +
  fs.readFileSync(importPath + 'node-core.js', 'utf8') +
  '\n'.repeat(2)
const browserCore =
  core +
  fs.readFileSync(importPath + 'browser-core.js', 'utf8') +
  '\n'.repeat(2)

const coreDir = path.join(__dirname, '../minified_core')

function generateCore () {
  if (!fs.existsSync(coreDir)) {
    fs.mkdirSync(coreDir)
  }

  const nodeCoreFile = path.join(coreDir, '/node-core.js')
  if (!fs.existsSync(nodeCoreFile)) {
    fs.writeFileSync(
      path.join(nodeCoreFile),
      escodegen.generate(esprima.parse(nodeCore), { format }),
      { encoding: 'utf8' }
    )
  }
  const browserCoreFile = path.join(coreDir, '/browser-core.js')
  if (!fs.existsSync(browserCoreFile)) {
    fs.writeFileSync(
      path.join(browserCoreFile),
      escodegen.generate(esprima.parse(browserCore), { format }),
      { encoding: 'utf8' }
    )
  }
}

module.exports = generateCore
