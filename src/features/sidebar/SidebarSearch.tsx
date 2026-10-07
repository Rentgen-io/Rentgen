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
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    <div className="relative border-b border-border dark:border-dark-border">
      <SearchIcon className="absolute -translate-y-1/2 top-1/2 left-3 w-4 h-4 text-text-secondary dark:text-dark-text-secondary pointer-events-none" />
      <input
        ref={inputRef}
        className="w-full py-2.5 px-9 text-xs bg-transparent border-none dark:text-dark-text outline-none placeholder:text-text-secondary dark:placeholder:text-dark-text-secondary box-border"
        type="text"
        value={localValue}
        placeholder={placeholder || t('collections.searchCollections')}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {localValue && (
        <ClearCrossIcon
          className="absolute -translate-y-1/2 top-1/2 right-3 w-4 h-4 text-text-secondary dark:text-dark-text-secondary hover:text-text dark:hover:text-dark-text cursor-pointer"
          onClick={() => handleChange('')}
        />
      )}
    </div>
  );
}
