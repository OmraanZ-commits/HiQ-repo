export type CustomerDepot = { customerCode: string; depot: string | null };
export type VendorMapping = { customerCode: string; depot: string; vendorCode: string };
export type PoValidity = {
  customerCode: string;
  validity: string | null;
  leadTime: string | null;
  roundingProfile: string | null;
};
export type PdpConfiguration = {
  customerCode: string;
  tsId: string | null;
  shippingPoint: string | null;
};
export type FssaiLicense = {
  customerCode: string;
  type: string;
  licenseNo: string;
  status: string;
  endDate: string | null;
};

export type CustomerOrderingRow = {
  customer: string;
  depot: string | null;
  vendorCode: string | null;
  poValidity: string | null;
  leadTime: string | null;
  roundingProfile: string | null;
  tsId: string | null;
  shippingPoint: string | null;
  license20B: string | null;
  license20BExpiry: string | null;
  license21B: string | null;
  license21BExpiry: string | null;
  licenseFDL: string | null;
  licenseFDLExpiry: string | null;
};

export type CustomerOrderingSources = {
  customerDepots: CustomerDepot[];
  vendors?: VendorMapping[];
  poValidity?: PoValidity[];
  pdp?: PdpConfiguration[];
  licenses?: FssaiLicense[];
};

function uniqueByCustomer<T extends { customerCode: string }>(rows: T[], source: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const row of rows) {
    const previous = result.get(row.customerCode);
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) {
      throw new Error(`Conflicting ${source} records for customer ${row.customerCode}`);
    }
    result.set(row.customerCode, row);
  }
  return result;
}

function expiryTime(date: string | null): number {
  if (!date) return -Infinity;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

export function buildCustomerOrderingMaster({
  customerDepots, vendors = [], poValidity = [], pdp = [], licenses = [],
}: CustomerOrderingSources): CustomerOrderingRow[] {
  const depotsByCustomer = new Map<string, Set<string>>();
  for (const row of customerDepots) {
    if (!depotsByCustomer.has(row.customerCode)) depotsByCustomer.set(row.customerCode, new Set());
    if (row.depot) depotsByCustomer.get(row.customerCode)!.add(row.depot);
  }

  const vendorsByKey = new Map<string, string>();
  for (const row of vendors) {
    const key = JSON.stringify([row.customerCode, row.depot]);
    if (vendorsByKey.has(key) && vendorsByKey.get(key) !== row.vendorCode) {
      throw new Error(`Conflicting vendor codes for customer ${row.customerCode} and depot ${row.depot}`);
    }
    vendorsByKey.set(key, row.vendorCode);
  }

  const poByCustomer = uniqueByCustomer(poValidity, "PO validity");
  const pdpByCustomer = uniqueByCustomer(pdp, "PDP");
  const licensesByKey = new Map<string, FssaiLicense>();
  for (const license of licenses) {
    if (!["20B", "21B", "FDL"].includes(license.type)) continue;
    const key = JSON.stringify([license.customerCode, license.type]);
    const current = licensesByKey.get(key);
    if (!current || (license.status === "C" && current.status !== "C") ||
      ((license.status === "C") === (current.status === "C") &&
        expiryTime(license.endDate) > expiryTime(current.endDate))) {
      licensesByKey.set(key, license);
    }
  }

  return Array.from(depotsByCustomer.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([customer, depotSet]) => {
    const depots = Array.from(depotSet).sort();
    const vendorValues = depots.flatMap(depot => {
      const code = vendorsByKey.get(JSON.stringify([customer, depot]));
      return code ? [depots.length > 1 ? `${depot}: ${code}` : code] : [];
    });
    const po = poByCustomer.get(customer);
    const pdpRow = pdpByCustomer.get(customer);
    const license20B = licensesByKey.get(JSON.stringify([customer, "20B"]));
    const license21B = licensesByKey.get(JSON.stringify([customer, "21B"]));
    const licenseFDL = licensesByKey.get(JSON.stringify([customer, "FDL"]));
    return {
      customer,
      depot: depots.join(", ") || null,
      vendorCode: vendorValues.join(", ") || null,
      poValidity: po?.validity ?? null,
      leadTime: po?.leadTime ?? null,
      roundingProfile: po?.roundingProfile ?? null,
      tsId: pdpRow?.tsId ?? null,
      shippingPoint: pdpRow?.shippingPoint ?? null,
      license20B: license20B?.licenseNo ?? null,
      license20BExpiry: license20B?.endDate ?? null,
      license21B: license21B?.licenseNo ?? null,
      license21BExpiry: license21B?.endDate ?? null,
      licenseFDL: licenseFDL?.licenseNo ?? null,
      licenseFDLExpiry: licenseFDL?.endDate ?? null,
    };
  });
}