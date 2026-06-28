import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ClearCrossIcon from '../../../assets/icons/clear-cross-icon.svg';
import SearchIcon from '../../../assets/icons/search-icon.svg';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CollectionSearch({ value, onChange, placeholder }: Props) {
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
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('collections.searchCollections')}
        className="w-full py-2.5 px-9 text-xs bg-transparent border-none dark:text-dark-text outline-none placeholder:text-text-secondary dark:placeholder:text-dark-text-secondary box-border"
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
