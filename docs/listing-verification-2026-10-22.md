# Listing verification — October 22, 2026

Public source checks produced 173 documents across Padmapper, Zumper, Trulia,
Zillow, Apartment List, Realtor, and Hotpads. HTTP success was not counted as
verification: the primary property, address, offer scope, and pricing had to
match. Sources that blocked requests were left unverified; access controls were
not bypassed.

## Applied results

| Result | Records |
| --- | ---: |
| Verified building records | 98 |
| Building rent ranges or starting prices | 97 |
| Explicit contact-for-price building | 1 |
| Verified exact-unit records in this pass | 5 |
| Newly confirmed unavailable units | 4 |
| Preserved historical duplicate records | 4 |
| Source mismatches still requiring replacement evidence | 2 |
| Stale records still unverified | 498 |
| Total records preserved | 612 |
| Active records after repair | 599 |
| Invalid numeric rents | 0 |
| Remaining shared source associations / quarantined conflicts | 0 |

The earlier pass had already confirmed five other units unavailable. All 498
unverified stale records and both source-mismatch records remain active. Four
historical duplicates and nine confirmed unavailable units are inactive. No
records were deleted; the existing saved-listing reference is unchanged.

## Previously unknown rents

These sources identify buildings rather than the originally implied apartments.
No building minimum was substituted for an exact unit's rent.

- [535 Carlton Avenue](https://www.realtor.com/rentals/details/551-Carlton-Ave_Brooklyn_NY_11238_M34413-09072): the primary property address is 535 Carlton despite the URL slug. The page explicitly says contact for price; no numeric quote is available.
- [888 Main Street](https://www.realtor.com/rentals/details/888-Main-St_New-York_NY_10044_M30606-72780): advertised building range $3,462–$7,630/month.
- [70 West 95th Street](https://www.realtor.com/rentals/details/70-W-95th-St_New-York_NY_10025_M35132-32463): advertised building starting price $4,995/month. The available floor plan does not establish the original record's unit identity.

## Conflicting IDs

- `padmapper:the-highland`: verified [The Highland at 2840 Atlantic Avenue](https://www.padmapper.com/buildings/p1528434/the-highland-apartments-at-2840-atlantic-avenue-new-york-ny-11207), assigned one building owner, and retained the second record as a historical reference.
- `padmapper:sky-three` and `zillow:Cknr6R`: retired old pages that redirect to search and independently verified [Sky Three at 532 Neptune Avenue](https://www.zillow.com/apartments/brooklyn-ny/sky-three/Cknr6R/). One building owner retains current source associations; three historical records link to it without an alias chain.
- `padmapper:blueground-new-york`: the original page now identifies 200 East 11th Street, not 141 East 33rd Street. Another association identifies Parker Towers in Queens. Both stored records remain visible, but those associations and their untrusted rents were removed. Two unknown rents therefore remain until a replacement source and exact property/unit evidence are obtained.

## Validation

- 314 tests passed across 28 files; no skipped tests or weakened assertions.
- Backend TypeScript and frontend production builds passed on Node 22.
- All 109 records with verification, identity, or retirement changes pass model validation.
- Private Extended JSON backups were written before the transaction. All 612 IDs, one saved-listing interaction, and zero alert-history records were preserved.
- Sparse unique source-key index remains enabled. No duplicate source ownership remains.
- A second verification preview proposes zero changes.
- Restarted local app reports MongoDB connected. NYC search returns 280 records under its existing city filter, retains stale warnings, and serves verified building pricing and historical-owner links.
- Browser inspection confirms building-level rent labels and October 22 source observations. API checks cover the three previously unknown rents, the Blueground warning, and a historical Sky Three reference.

Remaining stale records require accessible primary unit listings or an authorized
source feed. Missing units, blocked pages, redirects, and ambiguous offers are
not evidence of current availability or rent. Scheduled ingestion, authenticated
email delivery, and production deployment against Atlas were not exercised.
