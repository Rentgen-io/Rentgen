import cn from 'classnames';
import {
  FocusEvent,
  KeyboardEvent,
  ReactNode,
  RefObject,
  SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useAppSelector } from 'src/store/hooks';
import { selectVariableSuggestions } from 'src/store/selectors';
import { VariableSuggestion } from 'src/types';
import { getCaretCoordinates } from 'src/utils/caret';

type Field = HTMLInputElement | HTMLTextAreaElement;

// Minimal distance between the menu and the viewport edges
const VIEWPORT_PADDING = 8;
// Gap between the caret line and the menu
const MENU_OFFSET = 2;
const MAX_SUGGESTIONS = 100;
const MAX_ENVIRONMENT_DOTS = 4;

// An unfinished "{{name" right before the caret
const OPEN_VARIABLE_REGEX = /\{\{([^{}\s]*)$/;
// The rest of an existing variable right after the caret (e.g. editing "{{na|me}}"), replaced as well when a suggestion
// is accepted. Only when its closing braces follow, so text right after a newly typed "{{" is kept
const VARIABLE_REST_REGEX = /^[^{}\s]*}}/;

interface Match {
  start: number;
  end: number;
  query: string;
}

interface Handlers<T extends Field> {
  onBlur?: (event: FocusEvent<T>) => void;
  onKeyDown?: (event: KeyboardEvent<T>) => void;
  onSelect?: (event: SyntheticEvent<T>) => void;
}

/**
 * Suggests variables from all environments while typing "{{" in an input or textarea. Returns the handlers to put on
 * the field (wrapping the given ones), the menu to render and `reposition`, to call when the field scrolls.
 */
export default function useVariableAutocomplete<T extends Field>(
  fieldRef: RefObject<T | null>,
  { onBlur, onKeyDown, onSelect }: Handlers<T>,
  enabled = true,
) {
  const suggestions = useAppSelector(selectVariableSuggestions);

  const menuRef = useRef<HTMLUListElement>(null);
  const dismissedStart = useRef<number | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [positionVersion, setPositionVersion] = useState<number>(0);

  const filtered = useMemo(() => (match ? filterSuggestions(suggestions, match.query) : []), [match, suggestions]);
  const isOpen = enabled && filtered.length > 0;

  const updateMatch = useCallback(() => {
    const field = fieldRef.current;
    const { selectionStart, selectionEnd, value } = field ?? {};

    if (!field || document.activeElement !== field || selectionStart == null || selectionStart !== selectionEnd) {
      setMatch(null);
      return;
    }

    const open = OPEN_VARIABLE_REGEX.exec(value!.slice(0, selectionStart));
    if (!open || open.index === dismissedStart.current) {
      if (!open) dismissedStart.current = null;
      setMatch(null);
      return;
    }

    const rest = VARIABLE_REST_REGEX.exec(value!.slice(selectionStart))?.[0] ?? '';
    const next = { start: open.index, end: selectionStart + rest.length, query: open[1] };

    setMatch((previous) =>
      previous?.start === next.start && previous.end === next.end && previous.query === next.query ? previous : next,
    );
  }, [fieldRef]);

  // A new query changes the list, so the first (best) suggestion is selected again
  useEffect(() => setActiveIndex(0), [match?.query, match?.start]);

  const accept = (suggestion: VariableSuggestion) => {
    const field = fieldRef.current;
    if (!field || !match) return;

    const text = `{{${suggestion.key}}}`;

    field.focus();
    field.setSelectionRange(match.start, match.end);

    // Through the editing commands, so React's onChange fires and the insertion can be undone with Ctrl+Z
    if (!document.execCommand('insertText', false, text)) {
      field.setRangeText(text, match.start, match.end, 'end');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setMatch(null);
  };

  const handleKeyDown = (event: KeyboardEvent<T>) => {
    const hasModifier = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

    if (!isOpen || hasModifier) return onKeyDown?.(event);

    switch (event.key) {
      case 'ArrowDown':
        setActiveIndex((index) => (index + 1) % filtered.length);
        break;
      case 'ArrowUp':
        setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length);
        break;
      case 'Enter':
      case 'Tab':
        accept(filtered[Math.min(activeIndex, filtered.length - 1)]);
        break;
      case 'Escape':
        dismissedStart.current = match!.start;
        setMatch(null);
        break;
      default:
        return onKeyDown?.(event);
    }

    // Handled by the menu: no newline/tab inserted, no Escape closing a surrounding modal
    event.preventDefault();
    event.stopPropagation();
  };

  const handleBlur = (event: FocusEvent<T>) => {
    setMatch(null);
    onBlur?.(event);
  };

  const handleSelect = (event: SyntheticEvent<T>) => {
    updateMatch();
    onSelect?.(event);
  };

  // Places the menu under the "{{" (above it when there's no room below), within the viewport
  useLayoutEffect(() => {
    const field = fieldRef.current;
    const menu = menuRef.current;
    if (!isOpen || !field || !menu || !match) return;

    const fieldRect = field.getBoundingClientRect();
    const caret = getCaretCoordinates(field, match.start);
    const { width, height } = menu.getBoundingClientRect();
    const caretTop = fieldRect.top + Math.max(0, Math.min(caret.top, fieldRect.height - caret.height));
    const below = caretTop + caret.height + MENU_OFFSET;
    const above = caretTop - height - MENU_OFFSET;
    const left = fieldRect.left + Math.max(0, Math.min(caret.left, fieldRect.width));

    menu.style.left = `${clamp(left, window.innerWidth - width - VIEWPORT_PADDING)}px`;
    menu.style.top = `${
      below + height <= window.innerHeight - VIEWPORT_PADDING || above < VIEWPORT_PADDING ? below : above
    }px`;
  }, [fieldRef, isOpen, match, filtered.length, positionVersion]);

  useEffect(() => {
    menuRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => setMatch(null);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [isOpen]);

  const menu: ReactNode = isOpen
    ? createPortal(
        <ul
          className="fixed max-h-60 min-w-48 max-w-80 py-1 px-0 text-xs text-foreground bg-background rounded shadow-default overflow-y-auto z-100"
          ref={menuRef}
          role="listbox"
        >
          {filtered.map((suggestion, index) => (
            <li
              key={suggestion.key}
              aria-selected={index === activeIndex}
              className={cn('flex items-center gap-3 py-2 px-3 cursor-pointer', {
                'bg-accent-soft': index === activeIndex,
                'text-muted-foreground': !suggestion.isAvailable,
              })}
              role="option"
              title={suggestion.environments.map(({ title }) => title).join(', ')}
              onClick={() => accept(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
            >
              <span className="flex-auto truncate">{suggestion.key}</span>
              <span className="flex-none flex gap-1">
                {suggestion.environments.slice(0, MAX_ENVIRONMENT_DOTS).map((environment) => (
                  <span
                    className="size-2 rounded-full"
                    key={environment.id}
                    style={{ backgroundColor: environment.color }}
                  />
                ))}
                {suggestion.isGlobal && <span className="size-2 bg-variable-default rounded-full" />}
              </span>
            </li>
          ))}
        </ul>,
        document.body,
      )
    : null;

  return {
    fieldProps: { onBlur: handleBlur, onKeyDown: handleKeyDown, onSelect: handleSelect },
    menu,
    reposition: useCallback(() => setPositionVersion((version) => version + 1), []),
  };
}

/** Prefix matches first, then variables resolving in the selected environment, then alphabetically */
function filterSuggestions(suggestions: VariableSuggestion[], query: string): VariableSuggestion[] {
  const needle = query.toLowerCase();

  return suggestions
    .map((suggestion) => ({ suggestion, index: suggestion.key.toLowerCase().indexOf(needle) }))
    .filter(({ index }) => index >= 0)
    .sort(
      (a, b) =>
        Number(a.index !== 0) - Number(b.index !== 0) ||
        Number(!a.suggestion.isAvailable) - Number(!b.suggestion.isAvailable) ||
        a.suggestion.key.localeCompare(b.suggestion.key),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map(({ suggestion }) => suggestion);
}

function clamp(value: number, max: number): number {
  return Math.max(VIEWPORT_PADDING, Math.min(value, max));
}
