"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface UseSortableListOptions<T extends UniqueIdentifier> {
  items: T[];
  onReorder?: (oldIndex: number, newIndex: number) => void;
  activationConstraint?: PointerSensorOptions["activationConstraint"];
}

export function useSortableList<T extends UniqueIdentifier>({
  items,
  onReorder,
  activationConstraint = { distance: 8 },
}: UseSortableListOptions<T>) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const itemsRef = useRef<T[]>(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
    setOverId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over || active.id === over.id || !onReorder) {
        return;
      }

      const currentItems = itemsRef.current;
      const oldIndex = currentItems.findIndex((id) => id === active.id);
      const newIndex = currentItems.findIndex((id) => id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        // Use requestAnimationFrame to ensure @dnd-kit has cleared transforms
        // before state update, preventing visual jump
        requestAnimationFrame(() => {
          onReorder(oldIndex, newIndex);
        });
      }
    },
    [onReorder]
  );

  return {
    sensors,
    activeId,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
