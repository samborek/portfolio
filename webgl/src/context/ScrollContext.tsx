import { createContext, useContext, type ReactNode } from 'react';
import type { ScrollSyncManager } from '../managers/ScrollSyncManager';

const ScrollContext = createContext<ScrollSyncManager | null>(null);

export function ScrollProvider({
  manager,
  children,
}: {
  manager: ScrollSyncManager | null;
  children: ReactNode;
}) {
  return <ScrollContext.Provider value={manager}>{children}</ScrollContext.Provider>;
}

export function useScrollManager(): ScrollSyncManager | null {
  return useContext(ScrollContext);
}
