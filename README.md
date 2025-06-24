# check-unused-css

Utility for finding unused CSS classes in TypeScript projects.

## Install

```bash
npm install --save-dev check-unused-css
```

## Usage

Add script to package.json:

```json
{
  "scripts": {
    "check-unused-css": "check-unused-css"
  }
}
```

Run:

```bash
npm run check-unused-css
```

### Options

#### Custom styles object name

By default, the tool looks for CSS classes used as `styles.className`. You can specify a different object name:

```bash
npx check-unused-css --styles=myStyles
```

This will look for usage patterns like `myStyles.className` instead of `styles.className`.

## Supported file types

- `*.module.css`
- `*.module.scss` 
- `*.module.sass`

## Requirements
* TypeScript project with CSS Modules

## License

MIT
