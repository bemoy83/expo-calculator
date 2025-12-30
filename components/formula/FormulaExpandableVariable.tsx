"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FormulaVariableToken } from "./FormulaVariableToken";
import {
    ChevronRight,
} from 'lucide-react';

export interface FormulaExpandableVariableProps {
    label: string;                    // Display name (ex: "material")
    value: string;                    // Base token value
    isUsed: boolean;                  // Whether base token appears in formula
    onInsert: (val: string) => void;  // Insert into formula handler

    // Properties like: [{ label: "length", value: "material.length" }]
    properties?: {
        label: string;
        value: string;
        isUsed: boolean;
    }[];

    initiallyExpanded?: boolean;
}

export function FormulaExpandableVariable({
    label,
    value,
    isUsed,
    onInsert,
    properties = [],
    initiallyExpanded = false,
}: FormulaExpandableVariableProps) {
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const hasProperties = properties.length > 0;

    return (
        <div className="w-full">
            {/* Header Row — single grid cell */}
            <div className="flex items-center w-full min-w-0 gap-2">
                {/* Token stretches */}
                <div className="flex-1 min-w-0">
                    <FormulaVariableToken
                        label={label}
                        value={value}
                        isUsed={isUsed}
                        onInsert={onInsert}
                        size="sm"
                        layout="stretch"
                    />
                </div>

                {/* Chevron lives INSIDE same grid cell */}
                {hasProperties && (
                    <button
                        type="button"
                        onClick={() => setExpanded((p) => !p)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
                        className="flex items-center justify-center w-6 h-6 shrink-0
                       rounded-full
                       focus:outline-none focus:ring-2 focus:ring-md-primary/50"
                    >
                        <ChevronRight
                            className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                expanded ? "rotate-90" : "rotate-0"
                            )}
                        />
                    </button>
                )}
            </div>

            {/* Property List */}
            {expanded && hasProperties && (
                <div
                    className="mt-2 flex flex-col gap-2 w-full relative"
                >
                    {/* Vertical spine spanning THROUGH the gaps */}
                    <span className="ml-2
                        absolute 
                        left-0 
                        top-0 
                        bottom-0
                        w-px 
                        bg-md-primary"
                    />

                    {properties.map((prop, idx) => {
                        const isLast = idx === properties.length - 1;

                        return (
                            <div
                                key={prop.value}
                                className={cn(
                                    "relative w-full pl-8",

                                    // full-height spine for all rows
                                    "before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-md-outline-primary",

                                    // on last row: only keep lower half of the mask (flip)
                                    isLast &&
                                    "before:top-1/2 before:bottom-0 before:bg-md-surface-container",

                                    // horizontal elbow
                                    "after:absolute after:left-2 after:top-1/2 after:h-px after:w-6 after:bg-md-primary"
                                )}
                            >
                                <FormulaVariableToken
                                    label={prop.label}
                                    value={prop.value}
                                    isUsed={prop.isUsed}
                                    onInsert={onInsert}
                                    size="sm"
                                    layout="stretch"
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
