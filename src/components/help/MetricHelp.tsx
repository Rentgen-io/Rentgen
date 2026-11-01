import { useEffect, useId, useRef } from 'react';

interface Props {
  label: string;
  description: string;
}

export default function MetricHelp({ label, description }: Props) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const dismiss = () => popover.current?.hidePopover();
    window.addEventListener('resize', dismiss);
    document.addEventListener('scroll', dismiss, true);
    return () => {
      clearTimeout(hideTimer.current);
      window.removeEventListener('resize', dismiss);
      document.removeEventListener('scroll', dismiss, true);
    };
  }, []);

  const show = () => {
    clearTimeout(hideTimer.current);
    const trigger = button.current;
    const tip = popover.current;
    if (!trigger || !tip) return;
    tip.showPopover();
    const rect = trigger.getBoundingClientRect();
    const bounds = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(12, Math.min(rect.left - 12, window.innerWidth - bounds.width - 12))}px`;
    tip.style.top = `${rect.bottom + bounds.height + 20 > window.innerHeight
      ? Math.max(12, rect.top - bounds.height - 10)
      : rect.bottom + 10}px`;
  };

  const hide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (document.activeElement !== button.current) popover.current?.hidePopover();
    }, 120);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="metric-help-button"
        aria-label={label}
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={() => popover.current?.hidePopover()}
        onClick={show}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10 9v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="6.5" r=".85" fill="currentColor" />
        </svg>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="tooltip"
        className="metric-help-popover"
        onMouseEnter={() => clearTimeout(hideTimer.current)}
        onMouseLeave={hide}
      >
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
    </>
  );
}
