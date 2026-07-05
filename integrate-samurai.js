#!/usr/bin/env node

/**
 * Focus Lily Samurai Avatar Integration Script
 * This script helps integrate the samurai avatar into your Focus Lily project
 */

const fs = require('fs')
const path = require('path')

console.log('🎯 Focus Lily Samurai Avatar Integration')
console.log('==========================================')

// Check if we're in the Focus Lily project directory
const projectRoot = process.cwd()
const packageJsonPath = path.join(projectRoot, 'package.json')

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Not a Focus Lily project (package.json not found)')
  process.exit(1)
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

if (packageJson.name !== 'focus-lily') {
  console.error('❌ This is not a Focus Lily project')
  process.exit(1)
}

console.log('✅ Focus Lily project detected')

// Create necessary directories
const dirsToCreate = [
  'public/models/avatars',
  'src/components/avatars',
  'src/components/samurai'
]

dirsToCreate.forEach(dir => {
  const fullPath = path.join(projectRoot, dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`📁 Created directory: ${dir}`)
  }
})

// Copy integration files
const filesToCopy = [
  {
    source: './FocusLilySamuraiIntegration.jsx',
    dest: './src/components/samurai/FocusLilySamuraiIntegration.jsx'
  },
  {
    source: './TestSamuraiAvatar.jsx',
    dest: './src/pages/TestSamuraiAvatar.jsx'
  },
  {
    source: './SAMURAI_INTEGRATION_GUIDE.md',
    dest: './docs/SAMURAI_INTEGRATION_GUIDE.md'
  }
]

filesToCopy.forEach(({ source, dest }) => {
  const sourcePath = path.join(projectRoot, source)
  const destPath = path.join(projectRoot, dest)
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath)
    console.log(`📄 Copied: ${source} → ${dest}`)
  } else {
    console.warn(`⚠️  Source file not found: ${source}`)
  }
})

// Update CharacterAvatar.tsx to include samurai
const characterAvatarPath = path.join(projectRoot, 'src', 'components', 'CharacterAvatar.tsx')
if (fs.existsSync(characterAvatarPath)) {
  const currentContent = fs.readFileSync(characterAvatarPath, 'utf8')
  
  // Add samurai model import
  const samuraiImport = "import FocusLilySamuraiIntegration from '../samurai/FocusLilySamuraiIntegration'"
  
  if (!currentContent.includes(samuraiImport)) {
    const updatedContent = currentContent.replace(
      /import.*CharacterAvatar3D.*from/,
      `${samuraiImport}\nimport CharacterAvatar3D from`
    )
    
    // Add samurai to character models
    const characterModelsUpdate = updatedContent.replace(
      /const CHARACTER_MODELS = {[^}]+}/,
      `const CHARACTER_MODELS = {
  base: '/models/avatars/base.glb',
  samurai: '/models/avatars/samurai.glb',
  schoolboy: '/models/avatars/schoolboy.glb'
}`
    )
    
    fs.writeFileSync(characterAvatarPath, characterModelsUpdate)
    console.log('🔄 Updated CharacterAvatar.tsx with samurai support')
  }
}

// Create a sample route for testing
const routesPath = path.join(projectRoot, 'src', 'routes')
if (fs.existsSync(routesPath)) {
  const samuraiRoute = `
// Samurai Avatar Test Route
const TestSamuraiRoute = () => {
  return React.createElement(TestSamuraiAvatar)
}

export default TestSamuraiRoute
`
  
  fs.writeFileSync(path.join(routesPath, 'samurai-test.jsx'), samuraiRoute)
  console.log('🛣️  Created samurai test route')
}

// Update main app to include samurai option
const appPath = path.join(projectRoot, 'src', 'App.tsx')
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8')
  
  // Add samurai import
  const samuraiAppImport = "import TestSamuraiRoute from './routes/samurai-test'"
  
  if (!appContent.includes(samuraiAppImport)) {
    const updatedAppContent = appContent.replace(
      /import.*from.*routes/,
      `${samuraiAppImport}\nimport`
    )
    
    // Add samurai route to navigation
    const navUpdate = updatedAppContent.replace(
      /routes\.map.*route =>/,
      `routes.map(route => {
        if (route.path === '/samurai') {
          return { ...route, element: React.createElement(TestSamuraiRoute) }
        }
        return route
      })`
    )
    
    fs.writeFileSync(appPath, navUpdate)
    console.log('🔄 Updated App.tsx with samurai route')
  }
}

// Create a development script
const devScript = {
  "scripts": {
    "dev:samurai": "vite dev --port 3001",
    "build:samurai": "tsc -b && vite build",
    "preview:samurai": "vite preview"
  }
}

fs.writeFileSync(path.join(projectRoot, 'package.json'), 
  JSON.stringify({ ...packageJson, scripts: { ...packageJson.scripts, ...devScript.scripts } }, null, 2)
)

console.log('🚀 Integration complete!')
console.log('')
console.log('Next steps:')
console.log('1. Run: npm run dev:samurai')
console.log('2. Visit: http://localhost:3001/samurai')
console.log('3. Test the samurai avatar')
console.log('')
console.log('📚 See SAMURAI_INTEGRATION_GUIDE.md for detailed instructions')
console.log('🎯 Samurai avatar is now integrated into your Focus Lily project!')