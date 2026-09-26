import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExportedPack, LoadedPack } from '../calculator/pack';

// Settings that belong to this browser only: never exported, never replaced by an import.
interface DeviceStore {
  /**
   * Use-only mode hides building (New calculator, Edit) and the Functions, Materials and
   * Labor pages, leaving Calculators and Quotes. There are no accounts, so it's a
   * convenience for staff devices, not a lock.
   */
  useOnly: boolean;
  /** The calculator pack this browser loaded last, if any. */
  loadedPack?: LoadedPack;
  /** The last calculator pack exported from this browser, if any. */
  lastPackExport?: ExportedPack;
  setUseOnly: (useOnly: boolean) => void;
  setLoadedPack: (pack: LoadedPack | undefined) => void;
  setLastPackExport: (pack: ExportedPack) => void;
}

export const useDeviceStore = create<DeviceStore>()(
  persist(
    (set) => ({
      useOnly: false,
      loadedPack: undefined,
      lastPackExport: undefined,
      setUseOnly: (useOnly) => set({ useOnly }),
      setLoadedPack: (loadedPack) => set({ loadedPack }),
      setLastPackExport: (lastPackExport) => set({ lastPackExport }),
    }),
    { name: 'device-store' }
  )
);
