"use client";

import { useState, type ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "@/lib/client/queryClient";
import { creerPersister } from "@/lib/client/persister";

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [persister] = useState(creerPersister);
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: UN_JOUR_MS }}>
      {children}
    </PersistQueryClientProvider>
  );
}
