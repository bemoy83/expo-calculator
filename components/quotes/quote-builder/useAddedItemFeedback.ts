import { useState } from "react";

export function useAddedItemFeedback(input: {
  addLineItem: (instanceId: string) => boolean;
}) {
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const handleAddLineItem = (instanceId: string) => {
    const wasAdded = input.addLineItem(instanceId);
    if (!wasAdded) return;

    setAddedItems((prev) => new Set([...prev, instanceId]));
    setTimeout(() => {
      setAddedItems(new Set());
    }, 2000);
  };

  return {
    addedItems,
    handleAddLineItem,
  };
}
