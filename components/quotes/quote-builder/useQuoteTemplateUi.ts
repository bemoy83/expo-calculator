import { useState } from "react";
import type { ModuleTemplate } from "@/lib/types";

export function useQuoteTemplateUi(input: {
  createTemplateFromWorkspace: (name: string, description?: string) => ModuleTemplate | null;
  applyTemplate: (templateId: string) => {
    success: boolean;
    warnings: string[];
    appliedModules: number;
  };
  closeModulePicker: () => void;
}) {
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);
  const [templateWarnings, setTemplateWarnings] = useState<string[]>([]);

  const closeSaveTemplateModal = () => {
    setShowSaveTemplateModal(false);
    setTemplateName("");
    setTemplateDescription("");
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;

    const result = input.createTemplateFromWorkspace(
      templateName.trim(),
      templateDescription.trim() || undefined
    );
    if (result) {
      setTemplateSaveSuccess(result.name);
      setShowSaveTemplateModal(false);
      setTemplateName("");
      setTemplateDescription("");
      setTimeout(() => setTemplateSaveSuccess(null), 3000);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setTemplateWarnings([]);
    const result = input.applyTemplate(templateId);

    if (result.warnings.length > 0) {
      setTemplateWarnings(result.warnings);
      setTimeout(() => setTemplateWarnings([]), 5000);
    }

    input.closeModulePicker();
  };

  return {
    showSaveTemplateModal,
    templateName,
    templateDescription,
    templateSaveSuccess,
    templateWarnings,
    setTemplateName,
    setTemplateDescription,
    setTemplateSaveSuccess,
    setTemplateWarnings,
    openSaveTemplateModal: () => setShowSaveTemplateModal(true),
    closeSaveTemplateModal,
    handleSaveTemplate,
    handleApplyTemplate,
  };
}
