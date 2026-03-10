'use client';

import ReactFlagsSelect from 'react-flags-select';
import { COUNTRIES } from './COUNTRIES';

/**
 * Country selector using react-flags-select. Use for registration and profile.
 * @param {string} selected - ISO 3166-1 alpha-2 code (e.g. 'UA')
 * @param {function(string): void} onSelect - Called with country code when user selects
 * @param {string} [placeholder] - Placeholder when no selection
 * @param {boolean} [fullWidth] - Stretch to container width
 * @param {string} [className] - Additional root class names (merged with country-select)
 */
export default function CountrySelect({ selected = '', onSelect, placeholder = 'Select country', fullWidth = true, className }) {
  const rootClassName = ['country-select', className].filter(Boolean).join(' ');
  return (
    <ReactFlagsSelect
      className={rootClassName}
      selected={selected}
      onSelect={onSelect}
      countries={COUNTRIES}
      searchable
      searchPlaceholder={placeholder}
      placeholder={placeholder}
      showOptionLabel
      showSelectedLabel
      selectedSize={14}
      optionsSize={14}
      fullWidth={fullWidth}
    />
  );
}

export { COUNTRIES };
