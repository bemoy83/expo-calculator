'use client';

import { Dispatch, SetStateAction, useEffect, useRef } from 'react';

// Clears a field's validation error as soon as the user edits that field, instead of
// leaving it up until the next submit.
export function useClearErrorsOnChange<T extends Record<string, string>>(
  formData: T,
  setErrors: Dispatch<SetStateAction<Record<string, string>>>
) {
  const previous = useRef(formData);

  useEffect(() => {
    const changed = Object.keys(formData).filter((key) => formData[key] !== previous.current[key]);
    previous.current = formData;
    if (changed.length === 0) return;
    setErrors((errors) => {
      if (!changed.some((key) => key in errors)) return errors;
      const next = { ...errors };
      changed.forEach((key) => delete next[key]);
      return next;
    });
  }, [formData, setErrors]);
}
