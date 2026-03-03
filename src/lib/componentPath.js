/**
 * Add a stable class (and data attribute) to components/buttons so they are
 * easy to find in DevTools Inspect. Use on root element and on important buttons.
 *
 * @example
 * // Component root
 * <Box className={componentClass('Header')} ... />
 *
 * // Button inside Header
 * <Button className={componentClass('Header', 'LoginBtn')} ... />
 *
 * // Spread both class and data-fp-path for inspect
 * <div {...componentPathProps('LoginModal', 'CloseBtn')} />
 */
const PREFIX = 'fp-c-';

function sanitize(segment) {
  if (typeof segment !== 'string') return '';
  return segment.replace(/[^A-Za-z0-9_-]/g, '');
}

/**
 * Returns a single class name for the component path, e.g. "fp-c-Header" or "fp-c-LoginModal-SubmitBtn".
 * Use with className: className={cn(componentClass('Header'), otherClasses)}
 */
export function componentClass(...segments) {
  const safe = segments.map(sanitize).filter(Boolean);
  if (safe.length === 0) return '';
  return PREFIX + safe.join('-');
}

/**
 * Returns { className, 'data-fp-path': path } for spreading.
 * data-fp-path is the path with slashes for readability in inspector, e.g. "Header/LoginBtn".
 */
export function componentPathProps(...segments) {
  const safe = segments.map(sanitize).filter(Boolean);
  if (safe.length === 0) return {};
  return {
    className: PREFIX + safe.join('-'),
    'data-fp-path': safe.join('/'),
  };
}
