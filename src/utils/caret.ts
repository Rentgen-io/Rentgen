// Styles affecting where text is laid out, copied onto the mirror element
const MIRRORED_PROPERTIES = [
  'boxSizing',
  'width',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'wordBreak',
  'overflowWrap',
  'scrollbarGutter',
] as const;

/**
 * Coordinates of the caret at `position`, relative to the element's border box (taking its scroll into account).
 * Lays the text out in a hidden element styled like the input/textarea and measures where `position` lands.
 */
export function getCaretCoordinates(element: HTMLInputElement | HTMLTextAreaElement, position: number) {
  const style = getComputedStyle(element);
  const isInput = element instanceof HTMLInputElement;
  const mirror = document.createElement('div');
  const marker = document.createElement('span');

  MIRRORED_PROPERTIES.forEach((property) => (mirror.style[property] = style[property]));
  Object.assign(mirror.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    visibility: 'hidden',
    overflow: 'hidden',
    whiteSpace: isInput ? 'pre' : 'pre-wrap',
    height: 'auto',
  });

  mirror.textContent = element.value.slice(0, position);
  marker.textContent = element.value.slice(position) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const fontSize = parseFloat(style.fontSize);
  const lineHeight = parseFloat(style.lineHeight);
  const coordinates = {
    left: marker.offsetLeft + parseFloat(style.borderLeftWidth) - element.scrollLeft,
    top: marker.offsetTop + parseFloat(style.borderTopWidth) - element.scrollTop,
    height: lineHeight > 0 ? lineHeight : fontSize * 1.2,
  };

  mirror.remove();
  return coordinates;
}
