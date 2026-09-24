import { useState } from "react";
import { notify } from "@/lib/stores/notifications-store";
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
      notify({ message: `Saved template "${result.name}"`, variant: "success" });
      setShowSaveTemplateModal(false);
      setTemplateName("");
      setTemplateDescription("");
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
    templateWarnings,
    setTemplateName,
    setTemplateDescription,
    setTemplateWarnings,
    openSaveTemplateModal: () => setShowSaveTemplateModal(true),
    closeSaveTemplateModal,
    handleSaveTemplate,
    handleApplyTemplate,
  };
}
