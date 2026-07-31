// Network Change Type mapping: code -> name
export const NETWORK_CHANGE_TYPE_NAMES: Record<string, string> = {
  "CP_VALUE": "Consumer Promotion (Value)",
  "CP_VOLUME": "Consumer Promotion (Volume)",
  "RL_ART_PKG": "Relaunch – Artwork and Packaging Change",
  "RL_ART_FORM": "Relaunch – Artwork and Formulation Change",
  "RL_PKG_FORM": "Relaunch – Packaging and Formulation Change",
  "RL_ART": "Relaunch – Artwork Change",
  "RL_FORM": "Relaunch – Formulation Change",
  "RL_PKG": "Relaunch – Packaging Change",
  "RL_PRICE": "Relaunch – Pricing Change",
  "NEW_LAUNCH": "New Launch",
  "EXTENSION": "Relaunch",
  "RTD": "RTD",
  "SAMPLING": "Sampling",
  "TRANSIT": "Transit",
  "TRIAL": "Trial",
  "DELISTING": "Delisting",
  "OTHERS": "Others",
};

// Helper function to get name from code
export function getNetworkChangeTypeName(code: string | null | undefined): string {
  if (!code) return "-";
  return NETWORK_CHANGE_TYPE_NAMES[code] || code;
}
