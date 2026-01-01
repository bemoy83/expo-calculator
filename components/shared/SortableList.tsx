"use client";

import React from "react";
import {
  DndContext,
  DragOverlay,
  UniqueIdentifier,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useSortableList } from "@/hooks/use-sortable-list";

export interface SortableListProps<T extends { id: UniqueIdentifier }> {
  items: T[];
  onReorder?: (oldIndex: number, newIndex: number) => void;
  renderItem: (item: T) => React.ReactNode;
  className?: string;
  strategy?: SortingStrategy;
  activationConstraint?: Parameters<typeof useSortableList>[0]["activationConstraint"];
  overlayRender?: (item: T) => React.ReactNode;
  collisionDetection?: Parameters<typeof DndContext>[0]["collisionDetection"];
  modifiers?: Parameters<typeof DndContext>[0]["modifiers"];
}

export function SortableList<T extends { id: UniqueIdentifier }>({
  items,
  onReorder,
  renderItem,
  className,
  strategy = verticalListSortingStrategy,
  activationConstraint,
  overlayRender,
  collisionDetection = closestCenter,
  modifiers,
}: SortableListProps<T>) {
  const { sensors, activeId, overId, handleDragStart, handleDragOver, handleDragEnd } = useSortableList({
    items: items.map((i) => i.id),
    onReorder,
    activationConstraint,
  });

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      modifiers={modifiers ?? [restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={strategy}>
        <div className={className}>
          {items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      </SortableContext>

      {overlayRender && activeItem && (
        <DragOverlay adjustScale dropAnimation={null}>
          {overlayRender ? overlayRender(activeItem) : renderItem(activeItem)}
        </DragOverlay>
      )}
    </DndContext>
  );
}
