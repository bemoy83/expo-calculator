"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Link2, AlertTriangle, Sparkles, Wand2 } from "lucide-react";

/**
 * TemplatePreviewSidebar Component
 *
 * Static mockup tuned for core input reuse (width/height/quantity) in templates.
 * UI-only; swap mock data when wiring to real template/link state.
 */

export interface TemplatePreviewSidebarProps {
  moduleCount: number;
}

export function TemplatePreviewSidebar({ moduleCount }: TemplatePreviewSidebarProps) {
  // Mock data for visualization only (replace with real data when wiring up)
  const coreInputs = [
    {
      variable: "width",
      linkedTargets: ["Framing.width", "Drywall.width", "Paint.width"],
      missingTargets: ["Tile.width"],
    },
    {
      variable: "height",
      linkedTargets: ["Framing.height", "Drywall.height", "Paint.height"],
      missingTargets: [],
    },
    {
      variable: "quantity",
      linkedTargets: ["Framing.qty"],
      missingTargets: ["Drywall.quantity", "Paint.quantity"],
    },
  ];

  const warnings = [
    {
      title: "Unlinked core fields",
      detail: "Drywall.quantity, Paint.quantity not linked yet",
    },
  ];

  const smartMatches = [
    {
      title: "width → width",
      targets: ["Drywall.width", "Paint.width"],
      reason: "Matching variable name and unit (ft)",
    },
    {
      title: "height → height",
      targets: ["Drywall.height", "Paint.height"],
      reason: "Matching variable name and unit (ft)",
    },
  ];

  return (
    <div className="lg:col-span-1">
      <Card className="sticky top-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-md-primary">Link Overview</p>
            <p className="text-xs text-md-on-surface-variant">
              Quick snapshot of data flow across modules
            </p>
          </div>
          <Chip size="sm" variant="primary">
            {moduleCount} modules
          </Chip>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-md-on-surface-variant">
            <Wand2 className="h-4 w-4 text-md-primary" />
            <span className="font-semibold text-md-primary uppercase tracking-wide">Quick actions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-lg border border-border/80 bg-md-surface px-3 py-2 text-xs text-left hover:border-md-primary/70 transition-smooth">
              Link all width/height
              <p className="text-[11px] text-md-on-surface-variant mt-0.5">Apply across modules</p>
            </button>
            <button className="rounded-lg border border-border/80 bg-md-surface px-3 py-2 text-xs text-left hover:border-md-primary/70 transition-smooth">
              Link all quantity
              <p className="text-[11px] text-md-on-surface-variant mt-0.5">Sync counts</p>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-md-primary" />
            <p className="text-xs font-semibold text-md-primary uppercase tracking-wide">
              Core Inputs
            </p>
          </div>
          <div className="space-y-2">
            {coreInputs.map((input) => (
              <div key={input.variable} className="rounded-lg border border-border/80 p-3 bg-md-surface">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground">{input.variable}</span>
                  <Chip size="sm" variant="primary">
                    {input.linkedTargets.length} linked
                  </Chip>
                  {input.missingTargets.length > 0 && (
                    <Chip size="sm" variant="error">
                      {input.missingTargets.length} missing
                    </Chip>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-md-on-surface-variant">Linked to:</p>
                  {input.linkedTargets.map((target) => (
                    <div key={target} className="flex items-center gap-1">
                      <span className="text-md-primary">•</span>
                      <span className="font-mono text-foreground">{target}</span>
                    </div>
                  ))}
                  {input.missingTargets.length > 0 && (
                    <div className="mt-1 text-md-on-surface-variant">
                      <p className="text-[11px] uppercase tracking-wide">Missing:</p>
                      {input.missingTargets.map((miss) => (
                        <div key={miss} className="flex items-center gap-1 text-amber-600">
                          <span className="text-md-primary">+</span>
                          <span className="font-mono">{miss}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-md-primary uppercase tracking-wide">
              Smart Matches
            </p>
          </div>
          <div className="space-y-2">
            {smartMatches.map((match) => (
              <div key={match.title} className="rounded-lg border border-border/80 p-3 bg-md-surface">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{match.title}</p>
                  <Chip size="sm" variant="primary">
                    Auto
                  </Chip>
                </div>
                <p className="text-xs text-md-on-surface-variant mt-1">{match.reason}</p>
                <div className="mt-2 text-[11px] text-md-on-surface-variant">
                  Targets: {match.targets.join(", ")}
                </div>
                <div className="mt-2 text-[11px] text-md-primary font-semibold uppercase tracking-wide">
                  One-click link
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-md-primary uppercase tracking-wide">
              Warnings
            </p>
          </div>
          <div className="space-y-2">
            {warnings.map((warn) => (
              <div key={warn.title} className="rounded-lg border border-border/80 p-3 bg-md-surface">
                <p className="text-sm font-medium text-foreground">{warn.title}</p>
                <p className="text-xs text-md-on-surface-variant mt-1">{warn.detail}</p>
                <div className="mt-2 text-[11px] text-md-primary font-semibold uppercase tracking-wide">
                  Jump to field
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

