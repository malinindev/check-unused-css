# Why Avoid Dynamic Class Access?

Dynamic class access (like `styles[variable]`) might seem convenient, but it creates several maintenance and reliability issues in your codebase.

**[Jump to Solution](#solution-use-an-adapter-function)**


## Problems with Dynamic Access

### 1. Hard to Track and Maintain

```tsx
// Bad: Dynamic access makes it unclear what classes are used

const Component = ({ type, size }: Props) => {
  return <div className={styles[`${type}-${size}`]} />;
}
```

#### Issues:

- You can't easily find where specific CSS classes are used. You see the class in the production HTML, but can't find it by searching for that specific word in IDE.
- Refactoring tools can't track usage
- Code becomes harder to understand and debug

### 2. Easy to Forget to Add CSS

Your styles:
```css
.large {}
.medium {}
.small {}
```

```ts
// If you accidentally add a new prop value (like extraSmall), it's easy to forget to add the class.

// This is more likely if your types are defined in a separate file.

type Props = {
  size: 'large' | 'medium' | 'small' | 'extraSmall'
}

const Component = ({ size }: Props) => {
  return <div className={styles[size]} />;
}
```

### 3. Hard to Read and Understand

Often you need to modify the value to match the class name format:

```ts
const Component = ({ size }: Props) => {
  return <div className={styles[`container${capitalize(size)}`]} />;
}
```

This adds logic noise and hides the real set of styles used.

### 4. Some Tools May Not Work Properly

Static analysis tools and linters can't see what class names are used dynamically.

### 5. Bad for Code Review

Reviewers can't easily see what styles are used. It slows down the review process and makes bugs more likely.

### 6. Hard to Refactor

You can't rename class names with search-and-replace because the usage is hidden inside strings.

## Solution: Use an Adapter Function

The most obvious and simple solution (not just for styles) is to use an adapter map function with clear types:

```ts
type Size = 'large' | 'medium' | 'small';

const mapSizeToClassname: Record<Size, string> = {
  large: styles.large,
  medium: styles.medium,
  small: styles.small,
}

type Props = {
  size: Size
}

const Component = ({ size }: Props) => {
  return <div className={mapSizeToClassname[size]} />;
}

```

### Alternative: use [`class-variance-authority`](https://www.npmjs.com/package/class-variance-authority)

If you prefer a more declarative and scalable approach, use [`class-variance-authority`](https://www.npmjs.com/package/class-variance-authority)
. It combines conditional class logic with type safety and works fine with `check-unused-css`

### Benefits

- Easy to find in IDE and debug  
- Type-safe: TypeScript will show error if you forget to map a new value  
- Class names can have any format — no need to use string hacks like `capitalize` or `join`  
- Compatible with analytics and static tools  
