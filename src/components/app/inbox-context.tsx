"use client";

import { createContext, useContext } from "react";

/** Lets the top-bar inbox button show how many action items are waiting. */
const InboxCountContext = createContext(0);

export function InboxProvider({ count, children }: { count: number; children: React.ReactNode }) {
  return <InboxCountContext.Provider value={count}>{children}</InboxCountContext.Provider>;
}

export function useInboxCount() {
  return useContext(InboxCountContext);
}
