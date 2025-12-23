'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { ROW_HEIGHT } from '@/lib/grid-layout-config';

interface GridCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  defaultCollapsed?: boolean;
  dynamicHeight?: boolean; // Allow card to size based on content
}

/**
 * Grid Card Wrapper Component
 * Provides drag handle, resize handles, and collapse functionality
 */
export const GridCard = React.memo(function GridCard({
  id,
  title,
  children,
  className,
  defaultCollapsed = false,
  dynamicHeight = false,
}: GridCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // For dynamic height cards, update the grid item's height based on content
  useEffect(() => {
    if (!dynamicHeight || !cardRef.current || isCollapsed) return;

    let isUpdating = false; // Flag to prevent infinite loops
    let lastCalculatedHeight = 0; // Track last height to avoid unnecessary updates
    let styleObserverRef: MutationObserver | null = null; // Reference to style observer

    // Watch for react-grid-layout's style changes and immediately override
    const styleObserver = new MutationObserver((mutations) => {
      // Skip if we're already updating to prevent loops
      if (isUpdating) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const gridItem = cardRef.current?.closest('.react-grid-item') as HTMLElement;
          if (gridItem && gridItem.style.height && cardRef.current) {
            // Check if react-grid-layout set a height that doesn't match our calculated height
            const currentHeight = parseFloat(gridItem.style.height);
            const expectedHeight = parseFloat(gridItem.getAttribute('data-calculated-height') || '0');
            
            // Only update if height differs significantly (more than 5px)
            if (currentHeight && Math.abs(currentHeight - expectedHeight) > 5) {
              // Debounce to prevent rapid-fire updates
              setTimeout(() => {
                if (!isUpdating) {
                  updateHeight();
                }
              }, 10);
            }
          }
        }
      });
    });
    styleObserverRef = styleObserver;

    const updateHeight = () => {
      // Prevent recursive calls
      if (isUpdating) return;
      
      const gridItem = cardRef.current?.closest('.react-grid-item') as HTMLElement;
      if (!gridItem || !cardRef.current) return;

      isUpdating = true;

      try {
        // Temporarily remove height constraints to measure natural height
        const originalCardHeight = cardRef.current.style.height;
        cardRef.current.style.height = 'auto';
        gridItem.style.height = 'auto';
        
        // Force a reflow to get accurate measurements
        void cardRef.current.offsetHeight;
        
        // Measure the entire card's natural height
        const cardHeight = cardRef.current.scrollHeight || cardRef.current.offsetHeight;
        
        // Restore original card style
        cardRef.current.style.height = originalCardHeight;
        
        // Validate height
        if (!cardHeight || !isFinite(cardHeight) || cardHeight <= 0) {
          isUpdating = false;
          return; // Skip if invalid
        }
        
        const minHeight = 60; // Minimum 60px (1 grid unit)
        // Cap maximum height to prevent phantom full-screen sizes
        // If height is unreasonably large (>2000px), it's likely a bug - use content height instead
        const maxReasonableHeight = 2000;
        const totalHeight = Math.min(Math.max(cardHeight, minHeight), maxReasonableHeight);
        
        // Only update if height actually changed (within 1px tolerance)
        if (Math.abs(totalHeight - lastCalculatedHeight) < 1) {
          isUpdating = false;
          return;
        }
        
        lastCalculatedHeight = totalHeight;
        
        // Temporarily disconnect styleObserver to prevent loop
        if (styleObserverRef) {
          styleObserverRef.disconnect();
        }
        
        // Aggressively override react-grid-layout's height management
        // Remove any existing height styles first
        gridItem.style.removeProperty('height');
        gridItem.style.removeProperty('min-height');
        gridItem.style.removeProperty('max-height');
        
        // Set new height with !important
        gridItem.style.setProperty('height', `${totalHeight}px`, 'important');
        gridItem.style.setProperty('min-height', `${totalHeight}px`, 'important');
        gridItem.style.setProperty('max-height', `${totalHeight}px`, 'important');
        gridItem.setAttribute('data-calculated-height', totalHeight.toString());
        gridItem.setAttribute('data-dynamic-height', 'true');
        
        // Also set on the card itself to ensure consistency
        cardRef.current.style.setProperty('height', `${totalHeight}px`, 'important');
        
        // Update the data-grid attribute to match our calculated height
        // This prevents react-grid-layout from recalculating based on stored h value
        const gridUnits = Math.ceil(totalHeight / ROW_HEIGHT);
        const dataGridAttr = gridItem.getAttribute('data-grid');
        if (dataGridAttr) {
          try {
            const gridData = JSON.parse(dataGridAttr);
            if (gridData.h !== gridUnits) {
              gridData.h = gridUnits;
              gridItem.setAttribute('data-grid', JSON.stringify(gridData));
            }
          } catch (e) {
            // Ignore parse errors - create new data-grid if needed
            gridItem.setAttribute('data-grid', JSON.stringify({ h: gridUnits }));
          }
        } else {
          // Create data-grid attribute if it doesn't exist
          gridItem.setAttribute('data-grid', JSON.stringify({ h: gridUnits }));
        }
        
        // Verify the height was actually applied and fix if needed
        requestAnimationFrame(() => {
          const computedHeight = parseFloat(window.getComputedStyle(gridItem).height);
          if (Math.abs(computedHeight - totalHeight) > 2) {
            // Height still doesn't match - try more aggressive override
            gridItem.style.cssText += ` height: ${totalHeight}px !important; min-height: ${totalHeight}px !important; max-height: ${totalHeight}px !important;`;
          }
        });
        
        // Disable vertical resizing by hiding resize handles
        const resizeHandles = gridItem.querySelectorAll('.react-resizable-handle');
        resizeHandles.forEach((handle) => {
          const el = handle as HTMLElement;
          if (el.classList.contains('react-resizable-handle-se') || 
              el.classList.contains('react-resizable-handle-s') ||
              el.classList.contains('react-resizable-handle-sw')) {
            el.style.display = 'none';
          }
        });
        
        // Reconnect styleObserver after a brief delay
        setTimeout(() => {
          if (gridItem && cardRef.current && styleObserverRef) {
            styleObserverRef.observe(gridItem, {
              attributes: true,
              attributeFilter: ['style'],
            });
          }
        }, 50);
      } finally {
        isUpdating = false;
      }
    };

    // Observe grid item for style changes from react-grid-layout
    const gridItem = cardRef.current?.closest('.react-grid-item') as HTMLElement;
    if (gridItem) {
      styleObserver.observe(gridItem, {
        attributes: true,
        attributeFilter: ['style'],
      });
    }

    // Debounced update function to prevent excessive calls
    let updateTimeout: NodeJS.Timeout | null = null;
    const debouncedUpdateHeight = () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (!isUpdating) {
          updateHeight();
        }
      }, 50);
    };

    // Update height immediately and after layout
    // Use multiple attempts to catch react-grid-layout's initialization
    updateHeight();
    const timeoutId1 = setTimeout(updateHeight, 50);
    const timeoutId2 = setTimeout(updateHeight, 150);
    const timeoutId3 = setTimeout(updateHeight, 300);
    const rafId = requestAnimationFrame(() => {
      updateHeight();
      // Also update after next frame
      requestAnimationFrame(() => {
        updateHeight();
      });
    });
    
    // Also update on resize - observe both card and content
    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdateHeight();
    });
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    // Update when children change
    const mutationObserver = new MutationObserver(() => {
      debouncedUpdateHeight();
    });
    if (contentRef.current) {
      mutationObserver.observe(contentRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }

    return () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      styleObserver.disconnect();
    };
  }, [dynamicHeight, isCollapsed, children]);


  return (
    <div
      ref={cardRef}
      className={cn(
        'bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col group',
        dynamicHeight ? 'h-auto min-h-fit' : 'h-full',
        dynamicHeight && '[&_.react-resizable-handle-se]:hidden',
        dynamicHeight && '[&_.react-resizable-handle-s]:hidden',
        dynamicHeight && '[&_.react-resizable-handle-sw]:hidden',
        className
      )}
      data-grid-card-id={id}
      data-dynamic-height={dynamicHeight ? 'true' : 'false'}
      style={dynamicHeight ? { height: 'auto', maxHeight: 'none' } : undefined}
    >
      {/* Card Header with Drag Handle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <div className="drag-handle cursor-move text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>
          
          {/* Title */}
          <h3 className="text-sm font-semibold text-card-foreground truncate">{title}</h3>
        </div>

        {/* Collapse Button */}
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          aria-label={isCollapsed ? 'Expand card' : 'Collapse card'}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Card Content */}
      {!isCollapsed && (
        <div 
          ref={contentRef}
          className={cn(
            "overflow-x-hidden p-4",
            dynamicHeight ? "flex-none" : "flex-1 overflow-y-auto"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
});

