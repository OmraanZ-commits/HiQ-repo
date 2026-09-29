"""Read the supplied CSS configuration and translate SAP codes to business terms."""

import csv
from pathlib import Path


SOURCE = Path(__file__).with_name("css_customer_tolerance.tsv")
TAX_BASIS = {"LCWOT": "Pre-Tax", "LCWT": "Post-Tax"}


def _tolerance(lower: str, upper: str) -> str | None:
    if lower and upper:
        if float(lower) == -float(upper):
            return f"±{upper}"
        return f"{lower} to {upper}"
    return upper or lower or None


def read_css_configuration() -> list[dict]:
    rows = []
    seen = set()
    with SOURCE.open(newline="", encoding="utf-8") as file:
        for source in csv.DictReader(file, delimiter="\t"):
            customer = source["customer"]
            if customer in seen:
                raise ValueError(f"Duplicate CSS configuration for customer {customer}")
            seen.add(customer)
            cost_validation = source["cost_validation"]
            if cost_validation not in TAX_BASIS:
                raise ValueError(f"Unknown Cost Validation {cost_validation} for customer {customer}")
            rows.append({
                "customer": customer,
                "cssCondition": source["css_condition"],
                "taxBasis": TAX_BASIS[cost_validation],
                "tolerance": _tolerance(source["lower"], source["upper"]),
                "costValidation": cost_validation,
            })
    return rows


def css_for_customers(customer_codes: list[str], configuration: list[dict]) -> list[dict]:
    by_customer = {row["customer"]: row for row in configuration}
    return [
        by_customer.get(customer, {
            "customer": customer,
            "cssCondition": None,
            "taxBasis": "Not Applicable",
            "tolerance": None,
            "costValidation": None,
        })
        for customer in sorted(set(customer_codes))
    ]