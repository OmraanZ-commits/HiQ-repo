import { createContext, useContext } from "react";

export type NetworkGuidedTourContextValue = {
  start: () => void;
  active: boolean;
};

export const NetworkGuidedTourContext = createContext<NetworkGuidedTourContextValue | null>(null);

export function useNetworkGuidedTour() {
  const value = useContext(NetworkGuidedTourContext);
  if (!value) throw new Error("useNetworkGuidedTour must be used within NetworkGuidedTourProvider");
  return value;
}