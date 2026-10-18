import { HTMLAttributes, useEffect, useRef, useState } from 'react';

interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  startedAt?: number;
  timeoutMs: number;
  onTimeout?(): void;
}

export default function Timer({ className, startedAt, timeoutMs, onTimeout, ...otherProps }: Props) {
  const [mountedAt] = useState<number>(() => Date.now());
  const start = startedAt ?? mountedAt;
  const [now, setNow] = useState<number>(() => Date.now());

  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    let tickId: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const current = Date.now();
      setNow(current);

      const remaining = timeoutMs - (current - start);
      if (remaining <= 0) return;

      tickId = setTimeout(tick, remaining % 1000 || 1000);
    };

    tick();

    const remaining = Math.max(0, timeoutMs - (Date.now() - start));
    const timeoutId = setTimeout(() => {
      setNow(Date.now());
      onTimeoutRef.current?.();
    }, remaining);

    return () => {
      clearTimeout(tickId);
      clearTimeout(timeoutId);
    };
  }, [start, timeoutMs]);

  const remaining = Math.min(Math.max(0, timeoutMs - (now - start)), timeoutMs);

  return (
    <span className={className} {...otherProps}>
      {formatRemaining(remaining)}
    </span>
  );
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
