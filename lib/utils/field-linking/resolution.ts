import type { QuoteModuleInstance } from "../../types";
import type { BrokenFieldLink, FieldLinkResolution } from "./types";

export function resolveFieldLinksWithMetadata(
  instances: QuoteModuleInstance[]
): FieldLinkResolution {
  const resolvedValues: Record<string, Record<string, any>> = {};
  const brokenLinks: BrokenFieldLink[] = [];

  const resolve = (instanceId: string, fieldName: string, path: string[]): any => {
    const key = `${instanceId}.${fieldName}`;

    if (path.includes(key)) {
      const cycleStart = path.indexOf(key);
      const cycle = [...path.slice(cycleStart), key].join(" → ");
      console.warn(`Circular reference detected: ${cycle}`);
      throw new Error(`Circular reference: ${cycle}`);
    }

    const instance = instances.find((item) => item.id === instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    const link = instance.fieldLinks?.[fieldName];
    if (!link) return instance.fieldValues[fieldName];

    const targetInstance = instances.find((item) => item.id === link.moduleInstanceId);
    if (!targetInstance) {
      brokenLinks.push({ instanceId, fieldName });
      return instance.fieldValues[fieldName];
    }

    if (link.fieldVariableName.startsWith("out.")) {
      if (!(link.fieldVariableName in targetInstance.fieldValues)) {
        brokenLinks.push({ instanceId, fieldName });
        return instance.fieldValues[fieldName];
      }
      return targetInstance.fieldValues[link.fieldVariableName];
    }

    if (!(link.fieldVariableName in targetInstance.fieldValues)) {
      brokenLinks.push({ instanceId, fieldName });
      return instance.fieldValues[fieldName];
    }

    return resolve(link.moduleInstanceId, link.fieldVariableName, [...path, key]);
  };

  instances.forEach((instance) => {
    resolvedValues[instance.id] = {};

    Object.keys(instance.fieldValues).forEach((fieldName) => {
      try {
        resolvedValues[instance.id][fieldName] = resolve(instance.id, fieldName, []);
      } catch (error: any) {
        console.warn(`Error resolving link for ${instance.id}.${fieldName}:`, error.message);
        resolvedValues[instance.id][fieldName] = instance.fieldValues[fieldName];
      }
    });
  });

  return { resolvedValues, brokenLinks };
}

export function resolveFieldLinks(
  instances: QuoteModuleInstance[]
): Record<string, Record<string, any>> {
  const { resolvedValues } = resolveFieldLinksWithMetadata(instances);
  return resolvedValues;
}

export function removeBrokenFieldLinks(
  instances: QuoteModuleInstance[],
  brokenLinks: BrokenFieldLink[]
): QuoteModuleInstance[] {
  if (brokenLinks.length === 0) return instances;

  const brokenByInstance = new Map<string, Set<string>>();
  brokenLinks.forEach(({ instanceId, fieldName }) => {
    const fields = brokenByInstance.get(instanceId) ?? new Set<string>();
    fields.add(fieldName);
    brokenByInstance.set(instanceId, fields);
  });

  return instances.map((instance) => {
    const brokenFields = brokenByInstance.get(instance.id);
    if (!brokenFields || !instance.fieldLinks) return instance;

    const links = { ...instance.fieldLinks };
    brokenFields.forEach((fieldName) => {
      delete links[fieldName];
    });

    return {
      ...instance,
      fieldLinks: Object.keys(links).length > 0 ? links : undefined,
    };
  });
}
