import { useState, useEffect, useRef, useCallback } from 'react';
import { Field } from '@/lib/types';

interface UseFieldManagerProps {
  onFieldsChange?: (fields: Field[]) => void;
  onFieldChange?: () => void; // Called when fields change to trigger validation
}

export function useFieldManager({
  onFieldsChange,
  onFieldChange,
}: UseFieldManagerProps = {}) {
  const [fields, setFieldsInternal] = useState<Field[]>([]);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [newlyAddedFieldId, setNewlyAddedFieldId] = useState<string | null>(null);
  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Wrapper to call onFieldsChange callback
  const setFields = useCallback((newFields: Field[] | ((prev: Field[]) => Field[])) => {
    setFieldsInternal((prev) => {
      const updated = typeof newFields === 'function' ? newFields(prev) : newFields;
      onFieldsChange?.(updated);
      return updated;
    });
  }, [onFieldsChange]);

  const toggleFieldExpanded = useCallback((fieldId: string) => {
    setExpandedFields((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(fieldId)) {
        newExpanded.delete(fieldId);
      } else {
        newExpanded.add(fieldId);
      }
      return newExpanded;
    });
  }, []);

  const addField = useCallback(() => {
    const newField: Field = {
      id: `field-${Date.now()}`,
      label: '',
      type: 'number',
      variableName: '',
      required: false,
    };
    setFields((prev) => [...prev, newField]);
    setExpandedFields((prev) => new Set([...prev, newField.id]));
    setNewlyAddedFieldId(newField.id);
  }, [setFields]);

  const updateField = useCallback((id: string, updates: Partial<Field>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    onFieldChange?.(); // Trigger validation
  }, [setFields, onFieldChange]);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setExpandedFields((prev) => {
      const newExpanded = new Set(prev);
      newExpanded.delete(id);
      return newExpanded;
    });
    onFieldChange?.(); // Trigger validation
  }, [setFields, onFieldChange]);

  const reorderFields = useCallback((oldIndex: number, newIndex: number) => {
    setFields((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      return updated;
    });
  }, [setFields]);

  const setFieldRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      fieldRefs.current.set(id, element);
    } else {
      fieldRefs.current.delete(id);
    }
  }, []);

  // Auto-scroll to newly added field
  useEffect(() => {
    if (newlyAddedFieldId) {
      const fieldElement = fieldRefs.current.get(newlyAddedFieldId);
      if (fieldElement) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          // Calculate the position to scroll to, accounting for both sticky elements
          const elementRect = fieldElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Find the bottom action bar height (fixed at bottom)
          const bottomActionBar = document.querySelector('[data-bottom-action-bar]') as HTMLElement;
          const bottomActionBarHeight = bottomActionBar?.offsetHeight || 72; // Default ~72px (py-4 = 16px top + 16px bottom + button height ~40px)
          
          // Total space needed at bottom: action bar + padding
          const desiredBottomSpace = bottomActionBarHeight + 24; // Extra padding
          
          // Calculate how much we need to scroll
          const currentScrollY = window.scrollY;
          const elementTop = elementRect.top + currentScrollY;
          
          // Target: element should be visible with both buttons visible at bottom
          const targetScrollY = elementTop - (viewportHeight - elementRect.height - desiredBottomSpace);
          
          // Only scroll if the element is not already in a good position
          if (elementRect.bottom > viewportHeight - desiredBottomSpace || elementRect.top < 0) {
            window.scrollTo({
              top: Math.max(0, targetScrollY),
              behavior: 'smooth'
            });
          }
          
          setNewlyAddedFieldId(null);
        }, 100);
      }
    }
  }, [newlyAddedFieldId]);

  return {
    fields,
    expandedFields,
    newlyAddedFieldId,
    addField,
    updateField,
    removeField,
    reorderFields,
    toggleFieldExpanded,
    setFieldRef,
    setFields, // Allow external control if needed
  };
}

