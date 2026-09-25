import type { FunctionParamKind, SharedFunction } from '../types';

export type { FunctionParamKind } from '../types';

// What each parameter expects. A parameter's own kind wins; without one, a parameter the
// formula reads properties from (`material.width`) is a material and the rest are numbers.
export function getFunctionParamKinds(
  func: Pick<SharedFunction, 'formula' | 'parameters'>
): Record<string, FunctionParamKind> {
  return Object.fromEntries(
    func.parameters.map((param) => {
      if (param.kind) return [param.name, param.kind];
      const escaped = param.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const readsProperty = !!param.name && new RegExp(`(^|[^A-Za-z0-9_.])${escaped}\\.[A-Za-z_]`).test(func.formula);
      return [param.name, readsProperty ? 'material' : 'number'];
    })
  );
}
