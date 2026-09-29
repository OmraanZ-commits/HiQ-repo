import unittest

from server_py.services.ccr.css_master import css_for_customers, read_css_configuration


class CssMasterTests(unittest.TestCase):
    def test_css_mapping_preserves_raw_condition_and_formats_tolerance(self):
        by_customer = {row["customer"]: row for row in read_css_configuration()}
        self.assertEqual(len(by_customer), 36)
        self.assertEqual(by_customer["0000413316"], {
            "customer": "0000413316", "cssCondition": "RATIO",
            "taxBasis": "Pre-Tax", "tolerance": "±0.007", "costValidation": "LCWOT",
        })
        self.assertEqual(by_customer["0000413383"]["taxBasis"], "Post-Tax")
        self.assertEqual(by_customer["0000413383"]["tolerance"], "±0.005")
        self.assertEqual(by_customer["41B239"]["cssCondition"], "COST")
        self.assertEqual(by_customer["41B239"]["tolerance"], "0.20")
        self.assertEqual(by_customer["41B352"]["taxBasis"], "Pre-Tax")
        self.assertEqual(by_customer["41B904"]["tolerance"], "±0.02")

    def test_unconfigured_customers_are_not_applicable_without_multiplying_rows(self):
        rows = css_for_customers(
            ["0000413316", "NO-CONFIG", "0000413316"],
            read_css_configuration(),
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["taxBasis"], "Pre-Tax")
        self.assertEqual(rows[1], {
            "customer": "NO-CONFIG", "cssCondition": None,
            "taxBasis": "Not Applicable", "tolerance": None, "costValidation": None,
        })


if __name__ == "__main__":
    unittest.main()