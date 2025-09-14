# CI Integration Examples

Examples of integrating `check-unused-css` into CI/CD to automatically catch and fail builds with unused CSS.

## Prerequisites

Make sure `check-unused-css` is installed and a script is defined in `package.json`. (See [README.md](../README.md))

## GitHub Actions

Create `.github/workflows/check-css.yml`:

```yaml
name: Check Unused CSS

on:
  push:
    branches: ['main']
  pull_request:
    types: [opened, synchronize]

jobs:
  check-unused-css:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Check for unused CSS
        run: npm run check-unused-css
```

## GitLab CI

Add to your `.gitlab-ci.yml`:

```yaml
check-unused-css:
  stage: test
  image: node:20
  
  script:
    - npm ci
    - npm run check-unused-css
    
  only:
    - main
    - merge_requests
```

## CLI Options (for local runs or custom CI setups)

```bash
# Basic usage
check-unused-css

# Specify source directory
check-unused-css --src ./src/components

# Include specific file patterns
check-unused-css --include "**/*.module.{css,scss,sass}"

# Exclude directories
check-unused-css --exclude "**/test/**"

# Disable dynamic class detection (recommended for CI)
check-unused-css --no-dynamic

# Combine options
check-unused-css --src ./src/components --include "**/*.module.css" --no-dynamic
```
