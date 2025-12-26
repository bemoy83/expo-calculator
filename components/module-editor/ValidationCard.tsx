'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugInfo {
  variables: string[];
  unknownVariables: string[];
  fieldPropertyRefs: Array<{ full: string; fieldVar: string; property: string }>;
  materialPropertyRefs: Array<{ full: string; materialVar: string; property: string }>;
  mathFunctions: string[];
}

interface ValidationCardProps {
  formula: string;
  validation: {
    valid: boolean;
    error?: string;
    preview?: number;
  };
  debugInfo: DebugInfo;
}

export const ValidationCard = React.memo(function ValidationCard({
  formula,
  validation,
  debugInfo,
}: ValidationCardProps) {
  // Determine status chip state
  const getStatusChip = () => {
    if (validation.valid) {
      return {
        icon: CheckCircle2,
        label: 'Valid',
        className: 'text-success',
        bgClassName: 'bg-success/10 border-success/30',
      };
    } else if (validation.error) {
      return {
        icon: XCircle,
        label: 'Error',
        className: 'text-destructive',
        bgClassName: 'bg-destructive/10 border-destructive/30',
      };
    } else {
      return {
        icon: AlertCircle,
        label: 'Warning',
        className: 'text-warning',
        bgClassName: 'bg-warning/10 border-warning/30',
      };
    }
  };

  const statusChip = getStatusChip();
  const StatusIcon = statusChip.icon;

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validation Status</h4>
        <div className={cn(
          "p-3 rounded-lg border",
          validation.valid ? "bg-success/10 border-success/30" : 
          validation.error ? "bg-destructive/10 border-destructive/30" :
          "bg-muted border-border"
        )}>
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", statusChip.className)} aria-hidden="true" />
            <span className={cn("text-sm font-medium", statusChip.className)}>
              {formula ? statusChip.label : 'No formula'}
            </span>
          </div>
          {validation.error && (
            <p className="text-xs text-destructive mt-2 break-words">{validation.error}</p>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Debug Info</h4>
        
        {/* Standalone Variables */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            Variables ({debugInfo.variables.length})
          </p>
          {debugInfo.variables.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {debugInfo.variables.map((varName: string) => (
                <code
                  key={varName}
                  className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono text-accent"
                >
                  {varName}
                </code>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">None</p>
          )}
        </div>

        {/* Unknown Variables */}
        {debugInfo.unknownVariables.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-destructive font-medium">
              Unknown ({debugInfo.unknownVariables.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {debugInfo.unknownVariables.map((varName: string) => (
                <code
                  key={varName}
                  className="px-1.5 py-0.5 bg-destructive/10 border border-destructive/30 rounded text-[10px] font-mono text-destructive"
                >
                  {varName}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Field Property References */}
        {debugInfo.fieldPropertyRefs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">
              Field Props ({debugInfo.fieldPropertyRefs.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {debugInfo.fieldPropertyRefs.map((ref: { full: string; fieldVar: string; property: string }, idx: number) => (
                <code
                  key={`${ref.full}-${idx}`}
                  className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono text-accent"
                >
                  {ref.full}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Material Property References */}
        {debugInfo.materialPropertyRefs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">
              Material Props ({debugInfo.materialPropertyRefs.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {debugInfo.materialPropertyRefs.map((ref: { full: string; materialVar: string; property: string }, idx: number) => (
                <code
                  key={`${ref.full}-${idx}`}
                  className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono text-accent"
                >
                  {ref.full}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Math Functions */}
        {debugInfo.mathFunctions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">
              Functions ({debugInfo.mathFunctions.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {debugInfo.mathFunctions.map((funcName: string) => (
                <code
                  key={funcName}
                  className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground"
                >
                  {funcName}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Help */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Help</h4>
        <div className="text-xs text-muted-foreground space-y-2 pt-2">
          <p>• Click variables on the left to insert them</p>
          <p>• Use <code className="px-1 bg-muted rounded">material.property</code> for dimensions</p>
          <p>• <code className="px-1 bg-muted rounded">ceil()</code> rounds up, <code className="px-1 bg-muted rounded">floor()</code> rounds down</p>
          <p>• All values use base units (meters, kg, etc.)</p>
        </div>
      </div>
    </div>
  );
});

