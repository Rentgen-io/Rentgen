import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';
import SearchIcon from 'src/assets/icons/search-icon.svg';

interface Props {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function SideBarSearch({ placeholder, value, onChange }: Props) {
  const { t } = useTranslation();

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (val: string) => {
      setLocalValue(val);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(val), 150);
    },
    [onChange],
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleChange('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative border-b border-border">
      <SearchIcon className="absolute -translate-y-1/2 top-1/2 left-3 size-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        className="h-9 w-full py-2 px-9 text-xs bg-transparent border-none text-foreground outline-none placeholder:text-muted-foreground box-border"
        type="text"
        value={localValue}
        placeholder={placeholder || t('collections.searchRequests')}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {localValue && (
        <ClearCrossIcon
          className="absolute -translate-y-1/2 top-1/2 right-3 size-4 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => handleChange('')}
        />
      )}
    </div>
  );
}
