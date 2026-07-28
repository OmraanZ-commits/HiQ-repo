# CCR BRD v0.5 — Account Timelines (Type of Network)

> Source: `CCR_BRD_v0_5.xlsx`, sheet **Account timelines**. This document is a lossless flattening of the original spreadsheet. The original uses merged cells (2 columns per network); here each network is a row and empty source cells are explicitly marked "Not specified". Do not infer or invent values for cells marked "Not specified".

## 1. Network Master Attributes

| Network | CCR Action Scope | SBM/Listing Based | Pixel Required | Content Required | Customer Update Timeline (days) |
|---|---|---|---|---|---|
| BIGBASKET | National | No | 2000*2000 | FOP/BOP with EAN & grammage details/ Before & After Images | 10 |
| CLOUD TAIL | National | No | 1000*1000 | FOP/BOP/Before& After Image as FIFO is not followed | 5 |
| FLIPKART | National | No | 1100*1100 | FOP/BOP with EAN & grammage details/ Before & After HD Images | 14 |
| FLIPKART Grocery | Regional | No | 1100*1100 | FOP/BOP with EAN & grammage details/ Before & After HD Images | 15 |
| MYNTRA | National | No | 1080*1440 | FOP/BOP with EAN & grammage details/ Before & After Images | 7 |
| PURPLE | Regional | No | 1000*1000 | FOP/BOP with EAN & grammage details/ Price shot for MRP changes | 3 |
| SWIGGY INSTAMART | National | No | 1100*1100 | FOP/BOP with EAN & grammage details/ Price shot for MRP changes | 15 |
| ZEPTO | Regional | No | 1200*1200 | Before & After Image FOP BOP with grammage & price details | 10 |
| NYKAA | National | No | 1000 X1000 | BEFORE AFTER IMAGE | 14 |
| Blinkit | Regional | No | 2000*2000 | Before & After Image FOP / BOP with grammage, price details, formulation details | 5 |
| Metro | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| WalMart | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| SMGS | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| NYAKA | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| UDAN | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| JBTL | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| CPWI | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| BIPL | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |
| ROZAANA | Regional | Yes | Pic of Physical Sample | Pic of Physical Sample | 2 for EAN Update and 10 days for CIC Creation |

## 2. Scenario: No EAN Change — "Any network without EAN change"

A single answer applies per network (no With/Without EAN split for this scenario).

| Network | New CIC Required | Content Update Required | Rundown | New PO Required |
|---|---|---|---|---|
| BIGBASKET | Not specified | yes | yes | yes |
| CLOUD TAIL | No | Depends on nature of change - if artwork/ grammage change - Yes required | No in case there is no MRP/margin change | No in case there is no MRP/margin change |
| FLIPKART | Not specified | Not specified | Not specified | Not specified |
| FLIPKART Grocery | No | Yes | No | No |
| MYNTRA | No | Yes | - | No |
| PURPLE | Yes | Yes | No | No |
| SWIGGY INSTAMART | Yes (Grammage change - Foods>10%, Non Foods>20% | Yes (New grammage and MRP packshot) | Depends on Network change | No |
| ZEPTO | No | Yes | No | No |
| NYKAA | No | Yes | - | No |
| Blinkit | No | Yes | No | No |
| Metro | No | Yes | No | No |
| WalMart | No | Yes | No | No |
| SMGS | No | Yes | No | No |
| NYAKA | No | Yes | No | No |
| UDAN | No | Yes | No | No |
| JBTL | No | Yes | No | No |
| CPWI | No | Yes | No | No |
| BIPL | No | Yes | No | No |
| ROZAANA | No | Yes | No | No |

## 3. Change Scenarios — With EAN Change vs Without EAN Change

For each scenario below, every network has two variants: **With EAN change** and **Without EAN change**. Each variant answers three questions: New CIC Required, Content Update Required, Rundown.

### 3.1 CP callout on FOP (e.g. 10% off or 100g free callout) — question noted in source: 'Do all 4 CP types apply here?'

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | yes | yes | No |
| BIGBASKET | Without EAN change | No | Yes | No |
| CLOUD TAIL | With EAN change | No | Yes | Yes |
| CLOUD TAIL | Without EAN change | No | Yes | Yes |
| FLIPKART | With EAN change | No | Yes | No |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | NO- If change is less than 10% Yes - If change is more than 10% | Yes | No |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | Noo | Yes | - |
| MYNTRA | Without EAN change | No | Yes | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | Gramage call out change will require - Uom, Desc & Artwork change | Yes | Yes |
| SWIGGY INSTAMART | Without EAN change | No | Yes | No |
| ZEPTO | With EAN change | No | Yes | No |
| ZEPTO | Without EAN change | No | Yes | No |
| NYKAA | With EAN change | No | Yes | - |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | No | Yes | No |
| Blinkit | Without EAN change | No | Yes | No |
| Metro | With EAN change | Yes | No | No |
| Metro | Without EAN change | Yes | No | No |
| WalMart | With EAN change | Yes | No | No |
| WalMart | Without EAN change | Yes | No | No |
| SMGS | With EAN change | Yes | No | No |
| SMGS | Without EAN change | Yes | No | No |
| NYAKA | With EAN change | Yes | No | No |
| NYAKA | Without EAN change | Yes | No | No |
| UDAN | With EAN change | Yes | No | No |
| UDAN | Without EAN change | Yes | No | No |
| JBTL | With EAN change | Yes | No | No |
| JBTL | Without EAN change | Yes | No | No |
| CPWI | With EAN change | Yes | No | No |
| CPWI | Without EAN change | Yes | No | No |
| BIPL | With EAN change | Yes | No | No |
| BIPL | Without EAN change | Yes | No | No |
| ROZAANA | With EAN change | Yes | No | No |
| ROZAANA | Without EAN change | Yes | No | No |

### 3.2 Only artwork change (no formulation change)

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | No | yes | No |
| BIGBASKET | Without EAN change | No | yes | No |
| CLOUD TAIL | With EAN change | No | Yes | No |
| CLOUD TAIL | Without EAN change | No | Yes | No |
| FLIPKART | With EAN change | No | Yes | No |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | No | Yes | No |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | Noo | Yes | - |
| MYNTRA | Without EAN change | No | Yes | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | No | Yes | No |
| SWIGGY INSTAMART | Without EAN change | No | Yes | No |
| ZEPTO | With EAN change | No | Yes | No |
| ZEPTO | Without EAN change | No | Yes | No |
| NYKAA | With EAN change | No | Yes | - |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | No | Yes | No |
| Blinkit | Without EAN change | No | Yes | No |
| Metro | With EAN change | Yes | No | No |
| Metro | Without EAN change | Yes | No | No |
| WalMart | With EAN change | Yes | No | No |
| WalMart | Without EAN change | Yes | No | No |
| SMGS | With EAN change | Yes | No | No |
| SMGS | Without EAN change | Yes | No | No |
| NYAKA | With EAN change | Yes | No | No |
| NYAKA | Without EAN change | Yes | No | No |
| UDAN | With EAN change | Yes | No | No |
| UDAN | Without EAN change | Yes | No | No |
| JBTL | With EAN change | Yes | No | No |
| JBTL | Without EAN change | Yes | No | No |
| CPWI | With EAN change | Yes | No | No |
| CPWI | Without EAN change | Yes | No | No |
| BIPL | With EAN change | Yes | No | No |
| BIPL | Without EAN change | Yes | No | No |
| ROZAANA | With EAN change | Yes | No | No |
| ROZAANA | Without EAN change | Yes | No | No |

### 3.3 Artwork + packaging change (shape of tube changes, or carton to jar, or tube to tub)

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | Not specified | yes | No |
| BIGBASKET | Without EAN change | No | yes | No |
| CLOUD TAIL | With EAN change | No | Yes | No |
| CLOUD TAIL | Without EAN change | No | Yes | No |
| FLIPKART | With EAN change | No | Yes | No |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | No | Yes | No |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | Noo | Yes | - |
| MYNTRA | Without EAN change | No | Yes | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | No | Yes | Not specified |
| SWIGGY INSTAMART | Without EAN change | No | Yes | No |
| ZEPTO | With EAN change | No | Yes (Updated Packaging & Before-After images required) | No |
| ZEPTO | Without EAN change | No | Yes | No |
| NYKAA | With EAN change | No | Yes | - |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | Yes | Yes | Yes |
| Blinkit | Without EAN change | No | Yes | No |
| Metro | With EAN change | Yes | No | No |
| Metro | Without EAN change | Yes | No | No |
| WalMart | With EAN change | Yes | No | No |
| WalMart | Without EAN change | Yes | No | No |
| SMGS | With EAN change | Yes | No | No |
| SMGS | Without EAN change | Yes | No | No |
| NYAKA | With EAN change | Yes | No | No |
| NYAKA | Without EAN change | Yes | No | No |
| UDAN | With EAN change | Yes | No | No |
| UDAN | Without EAN change | Yes | No | No |
| JBTL | With EAN change | Yes | No | No |
| JBTL | Without EAN change | Yes | No | No |
| CPWI | With EAN change | Yes | No | No |
| CPWI | Without EAN change | Yes | No | No |
| BIPL | With EAN change | Yes | No | No |
| BIPL | Without EAN change | Yes | No | No |
| ROZAANA | With EAN change | Yes | No | No |
| ROZAANA | Without EAN change | Yes | No | No |

### 3.4 Grammage change

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | Y if >10% change | yes | No |
| BIGBASKET | Without EAN change | Yes | Yes | No |
| CLOUD TAIL | With EAN change | No | Yes | Yes |
| CLOUD TAIL | Without EAN change | No | Yes | Yes |
| FLIPKART | With EAN change | Y if >15% change | Yes | N |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | Y if >15% change | Yes | N |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | No | Yes | No |
| MYNTRA | Without EAN change | No | Yes | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | Y for >20% (Non-F&R) 10%(for F&R) | Yes | Y |
| SWIGGY INSTAMART | Without EAN change | Y for >20% (Non-F&R) 10%(for F&R) | Yes | YEs |
| ZEPTO | With EAN change | N / Y if regionally different CBUs | Yes ( only if packshots to showcase new graamage) | N |
| ZEPTO | Without EAN change | N / Y if regionally different CBUs | Yes | No |
| NYKAA | With EAN change | N | Yes | N |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | Y if >20% change | Yes | Yes |
| Blinkit | Without EAN change | No | Yes | No |
| Metro | With EAN change | Y if >10% change | No | No |
| Metro | Without EAN change | Yes | No | No |
| WalMart | With EAN change | Y if >10% change | No | No |
| WalMart | Without EAN change | Yes | No | No |
| SMGS | With EAN change | Y if >10% change | No | No |
| SMGS | Without EAN change | Yes | No | No |
| NYAKA | With EAN change | Y if >10% change | No | No |
| NYAKA | Without EAN change | Yes | No | No |
| UDAN | With EAN change | Y if >10% change | No | No |
| UDAN | Without EAN change | Yes | No | No |
| JBTL | With EAN change | Y if >10% change | No | No |
| JBTL | Without EAN change | Yes | No | No |
| CPWI | With EAN change | Y if >10% change | No | No |
| CPWI | Without EAN change | Yes | No | No |
| BIPL | With EAN change | Y if >10% change | No | No |
| BIPL | Without EAN change | Yes | No | No |
| ROZAANA | With EAN change | Y if >10% change | No | No |
| ROZAANA | Without EAN change | Yes | No | No |

### 3.5 Case config change

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | yes | yes | yes |
| BIGBASKET | Without EAN change | yes | yes | yes |
| CLOUD TAIL | With EAN change | No | No | No |
| CLOUD TAIL | Without EAN change | No | No | No |
| FLIPKART | With EAN change | No | No | No |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | No | No | No |
| FLIPKART Grocery | Without EAN change | No | No | No |
| MYNTRA | With EAN change | No | No | - |
| MYNTRA | Without EAN change | No | No | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | No | No | No |
| SWIGGY INSTAMART | Without EAN change | No | No | No |
| ZEPTO | With EAN change | No | No | No |
| ZEPTO | Without EAN change | No | No | No |
| NYKAA | With EAN change | No | No | - |
| NYKAA | Without EAN change | No | No | - |
| Blinkit | With EAN change | No | No | No |
| Blinkit | Without EAN change | No | Yes | No |
| Metro | With EAN change | Yes | No | No |
| Metro | Without EAN change | Yes | No | No |
| WalMart | With EAN change | Yes | No | No |
| WalMart | Without EAN change | Yes | No | No |
| SMGS | With EAN change | Yes | No | No |
| SMGS | Without EAN change | Yes | No | No |
| NYAKA | With EAN change | Yes | No | No |
| NYAKA | Without EAN change | Yes | No | No |
| UDAN | With EAN change | Yes | No | No |
| UDAN | Without EAN change | Yes | No | No |
| JBTL | With EAN change | Yes | No | No |
| JBTL | Without EAN change | Yes | No | No |
| CPWI | With EAN change | Yes | No | No |
| CPWI | Without EAN change | Yes | No | No |
| BIPL | With EAN change | Yes | No | No |
| BIPL | Without EAN change | Yes | No | No |
| ROZAANA | With EAN change | Yes | No | No |
| ROZAANA | Without EAN change | Yes | No | No |

### 3.6 Only formulation change (no pack callout)

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | yes | yes | No |
| BIGBASKET | Without EAN change | yes | yes | No |
| CLOUD TAIL | With EAN change | No | No | No |
| CLOUD TAIL | Without EAN change | No | No | No |
| FLIPKART | With EAN change | No | Yes | No |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | No | Yes | No |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | No | Yes | - |
| MYNTRA | Without EAN change | No | Yes | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | No | No | No |
| SWIGGY INSTAMART | Without EAN change | No | No | No |
| ZEPTO | With EAN change | No | No | No |
| ZEPTO | Without EAN change | No | No | No |
| NYKAA | With EAN change | No | Yes | - |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | No | No | No |
| Blinkit | Without EAN change | No | Yes | No |
| Metro | With EAN change | No | No | No |
| Metro | Without EAN change | No | No | No |
| WalMart | With EAN change | No | No | No |
| WalMart | Without EAN change | No | No | No |
| SMGS | With EAN change | No | No | No |
| SMGS | Without EAN change | No | No | No |
| NYAKA | With EAN change | No | No | No |
| NYAKA | Without EAN change | No | No | No |
| UDAN | With EAN change | No | No | No |
| UDAN | Without EAN change | No | No | No |
| JBTL | With EAN change | No | No | No |
| JBTL | Without EAN change | No | No | No |
| CPWI | With EAN change | No | No | No |
| CPWI | Without EAN change | No | No | No |
| BIPL | With EAN change | No | No | No |
| BIPL | Without EAN change | No | No | No |
| ROZAANA | With EAN change | No | No | No |
| ROZAANA | Without EAN change | No | No | No |

### 3.7 Formulation + artwork change

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | No | Yes | No |
| BIGBASKET | Without EAN change | No | Yes | No |
| CLOUD TAIL | With EAN change | No | Yes | No |
| CLOUD TAIL | Without EAN change | No | Yes | No |
| FLIPKART | With EAN change | No | Yes | No |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | No | Yes | No |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | Noo | Yes | - |
| MYNTRA | Without EAN change | No | Yes | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | No | Yes | No |
| SWIGGY INSTAMART | Without EAN change | No | Yes | No |
| ZEPTO | With EAN change | No | Yes | No |
| ZEPTO | Without EAN change | No | Yes | No |
| NYKAA | With EAN change | No | Yes | - |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | No | Yes | No |
| Blinkit | Without EAN change | No | Yes | No |
| Metro | With EAN change | Yes | No | No |
| Metro | Without EAN change | Yes | No | No |
| WalMart | With EAN change | Yes | No | No |
| WalMart | Without EAN change | Yes | No | No |
| SMGS | With EAN change | Yes | No | No |
| SMGS | Without EAN change | Yes | No | No |
| NYAKA | With EAN change | Yes | No | No |
| NYAKA | Without EAN change | Yes | No | No |
| UDAN | With EAN change | Yes | No | No |
| UDAN | Without EAN change | Yes | No | No |
| JBTL | With EAN change | Yes | No | No |
| JBTL | Without EAN change | Yes | No | No |
| CPWI | With EAN change | Yes | No | No |
| CPWI | Without EAN change | Yes | No | No |
| BIPL | With EAN change | Yes | No | No |
| BIPL | Without EAN change | Yes | No | No |
| ROZAANA | With EAN change | Yes | No | No |
| ROZAANA | Without EAN change | Yes | No | No |

### 3.8 Pricing change <10%

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | No | No | No |
| BIGBASKET | Without EAN change | No | No | No |
| CLOUD TAIL | With EAN change | No | Yes | Yes |
| CLOUD TAIL | Without EAN change | No | Yes | Yes |
| FLIPKART | With EAN change | N | Yes | N |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | N | Yes | N |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | No | No | No |
| MYNTRA | Without EAN change | No | No | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | No | Yes | Y |
| SWIGGY INSTAMART | Without EAN change | No | Yes | No |
| ZEPTO | With EAN change | Yes ( new PVID when EAN and Pricing both changes) | Yes | N |
| ZEPTO | Without EAN change | No | Yes | No |
| NYKAA | With EAN change | N | No | N |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | No | Yes | Yes |
| Blinkit | Without EAN change | No | Yes | Yes |
| Metro | With EAN change | No | No | No |
| Metro | Without EAN change | No | No | No |
| WalMart | With EAN change | No | No | No |
| WalMart | Without EAN change | No | No | No |
| SMGS | With EAN change | No | No | No |
| SMGS | Without EAN change | No | No | No |
| NYAKA | With EAN change | No | No | No |
| NYAKA | Without EAN change | No | No | No |
| UDAN | With EAN change | No | No | No |
| UDAN | Without EAN change | No | No | No |
| JBTL | With EAN change | No | No | No |
| JBTL | Without EAN change | No | No | No |
| CPWI | With EAN change | No | No | No |
| CPWI | Without EAN change | No | No | No |
| BIPL | With EAN change | No | No | No |
| BIPL | Without EAN change | No | No | No |
| ROZAANA | With EAN change | No | No | No |
| ROZAANA | Without EAN change | No | No | No |

### 3.9 Pricing change >10%

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | Yes | Yes | No |
| BIGBASKET | Without EAN change | Yes | Yes | No |
| CLOUD TAIL | With EAN change | No | Yes if there is an artwork change | Yes |
| CLOUD TAIL | Without EAN change | No | Yes if there is an artwork change | Yes |
| FLIPKART | With EAN change | Y if >15% change | Yes | N |
| FLIPKART | Without EAN change | Y if >15% change | Yes | No |
| FLIPKART Grocery | With EAN change | Y if >15% change | Yes | N |
| FLIPKART Grocery | Without EAN change | Yes | Yes | No |
| MYNTRA | With EAN change | No | No | No |
| MYNTRA | Without EAN change | No | No | - |
| PURPLE | With EAN change | Yes | Yes | No |
| PURPLE | Without EAN change | Yes | Yes | No |
| SWIGGY INSTAMART | With EAN change | No | Yes | Yes |
| SWIGGY INSTAMART | Without EAN change | No | Yes | Yes |
| ZEPTO | With EAN change | Yes ( new PVID when EAN and Pricing both changes) | Yes (Product details changes required) | N |
| ZEPTO | Without EAN change | No | Yes | No |
| NYKAA | With EAN change | >10% | No | N |
| NYKAA | Without EAN change | No | Yes | - |
| Blinkit | With EAN change | Yes | Yes | Yes |
| Blinkit | Without EAN change | Yes | Yes | Yes |
| Metro | With EAN change | Yes | No | No |
| Metro | Without EAN change | Yes | No | No |
| WalMart | With EAN change | Yes | No | No |
| WalMart | Without EAN change | Yes | No | No |
| SMGS | With EAN change | Yes | No | No |
| SMGS | Without EAN change | Yes | No | No |
| NYAKA | With EAN change | Yes | No | No |
| NYAKA | Without EAN change | Yes | No | No |
| UDAN | With EAN change | Yes | No | No |
| UDAN | Without EAN change | Yes | No | No |
| JBTL | With EAN change | Yes | No | No |
| JBTL | Without EAN change | Yes | No | No |
| CPWI | With EAN change | Yes | No | No |
| CPWI | Without EAN change | Yes | No | No |
| BIPL | With EAN change | Yes | No | No |
| BIPL | Without EAN change | Yes | No | No |
| ROZAANA | With EAN change | Yes | No | No |
| ROZAANA | Without EAN change | Yes | No | No |

### 3.10 Shelf life change (e.g. shelf life changes from 9 months to 12 months)

| Network | EAN Variant | New CIC Required | Content Update Required | Rundown |
|---|---|---|---|---|
| BIGBASKET | With EAN change | No | No | No |
| BIGBASKET | Without EAN change | No | No | No |
| CLOUD TAIL | With EAN change | No | Yes | No |
| CLOUD TAIL | Without EAN change | No | Yes | No |
| FLIPKART | With EAN change | No | Yes | No |
| FLIPKART | Without EAN change | No | Yes | No |
| FLIPKART Grocery | With EAN change | No | Yes | No |
| FLIPKART Grocery | Without EAN change | No | Yes | No |
| MYNTRA | With EAN change | No | No | - |
| MYNTRA | Without EAN change | No | No | - |
| PURPLE | With EAN change | No | No | No |
| PURPLE | Without EAN change | No | No | No |
| SWIGGY INSTAMART | With EAN change | No | No | No |
| SWIGGY INSTAMART | Without EAN change | No | No | No |
| ZEPTO | With EAN change | No | Yes (Only product details needs to be updated) | No |
| ZEPTO | Without EAN change | No | Yes | No |
| NYKAA | With EAN change | No | No | No |
| NYKAA | Without EAN change | No | No | - |
| Blinkit | With EAN change | No | No | No |
| Blinkit | Without EAN change | No | No | No |
| Metro | With EAN change | No | No | No |
| Metro | Without EAN change | No | No | No |
| WalMart | With EAN change | No | No | No |
| WalMart | Without EAN change | No | No | No |
| SMGS | With EAN change | No | No | No |
| SMGS | Without EAN change | No | No | No |
| NYAKA | With EAN change | No | No | No |
| NYAKA | Without EAN change | No | No | No |
| UDAN | With EAN change | No | No | No |
| UDAN | Without EAN change | No | No | No |
| JBTL | With EAN change | No | No | No |
| JBTL | Without EAN change | No | No | No |
| CPWI | With EAN change | No | No | No |
| CPWI | Without EAN change | No | No | No |
| BIPL | With EAN change | No | No | No |
| BIPL | Without EAN change | No | No | No |
| ROZAANA | With EAN change | No | No | No |
| ROZAANA | Without EAN change | No | No | No |
