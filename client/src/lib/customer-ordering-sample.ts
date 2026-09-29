import type { CustomerOrderingSources } from "./customer-ordering-master";

// Example source rows supplied in the Customer Ordering & Compliance Master specification.
// These are for an explicitly labeled preview, not persisted CCR customer data.
export const customerOrderingSample: CustomerOrderingSources = {
  customerDepots: [
    { customerCode: "0000100003", depot: "ABDH" },
    { customerCode: "0000100006", depot: "BNDH" },
    { customerCode: "0000101024", depot: "PATH" },
    { customerCode: "0000101075", depot: "ABDH" },
  ],
  vendors: [
    { customerCode: "0000100003", depot: "ABDH", vendorCode: "0025010452" },
    { customerCode: "0000100006", depot: "BNDH", vendorCode: "0025010454" },
    { customerCode: "0000101024", depot: "PATH", vendorCode: "0025016777" },
    { customerCode: "0000101075", depot: "ABDH", vendorCode: "0025010452" },
  ],
  poValidity: [
    { customerCode: "0000100003", validity: "7", leadTime: null, roundingProfile: null },
    { customerCode: "0000100006", validity: "7", leadTime: null, roundingProfile: null },
    { customerCode: "0000101024", validity: "7", leadTime: null, roundingProfile: "ZRR4" },
    { customerCode: "0000101075", validity: "7", leadTime: null, roundingProfile: "ZRR4" },
  ],
  pdp: [
    { customerCode: "0000100003", tsId: "CLOSED", shippingPoint: "ABD" },
    { customerCode: "0000100006", tsId: "CLOSED", shippingPoint: "BND" },
    { customerCode: "0000101024", tsId: "CLOSED", shippingPoint: "PAT" },
    { customerCode: "0000101075", tsId: "CLOSED", shippingPoint: "ABD" },
  ],
  licenses: [
    { customerCode: "0000101024", type: "20B", licenseNo: "0000013624", status: "C", endDate: "31-Dec-2026" },
    { customerCode: "0000101024", type: "21B", licenseNo: "0000013239", status: "C", endDate: "31-Dec-2026" },
    { customerCode: "0000101024", type: "FDL", licenseNo: "0000010533", status: "C", endDate: "10-Dec-2027" },
    { customerCode: "0000101075", type: "20B", licenseNo: "0000012368", status: "C", endDate: "24-Feb-2026" },
    { customerCode: "0000101075", type: "21B", licenseNo: "0000012369", status: "C", endDate: "24-Feb-2026" },
    { customerCode: "0000101075", type: "FDL", licenseNo: "0000010507", status: "C", endDate: "11-Dec-2029" },
    { customerCode: "0000100003", type: "FDL", licenseNo: "0000010615", status: "C", endDate: "29-Jun-2022" },
    { customerCode: "0000100006", type: "FDL", licenseNo: "0000015182", status: "C", endDate: "05-Jul-2022" },
  ],
};