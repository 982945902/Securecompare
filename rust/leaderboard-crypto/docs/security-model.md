# Security Model

This crate targets encrypted sortable leaderboard values. It is not an MPC protocol and does not provide MPC-equivalent privacy.

## Trusted Parties

The scheme assumes a setup authority that generates master material and issues query material to authorized users. Clients do not generate unrelated private keys. Cross-client comparison is possible because all keys and tokens are derived from a common setup.

## Server Visibility

The leaderboard service receives encrypted comparison artifacts. In the paper's m-ORE interface, comparison is asymmetric: the server compares a ciphertext generated from the master secret key with a token generated from the query key.

The server can compare encrypted values and therefore learns ranking relations. This order leakage is inherent to the leaderboard feature.

## Expected Leakage

Base m-ORE leakage includes:

- Relative order between compared values.
- Equality if the comparison layer exposes equality.
- Whether the most significant differing bit position is the same across selected triples of messages, as described by the paper's `Lf` leakage.
- Submission metadata such as account id, category, timestamp, and IP-level transport metadata.

m-H-ORE adds:

- Bit-length order leakage, because it compares message bit lengths first through small-domain ORE.

## Non-Goals

- Preventing users from lying about submitted values.
- Hiding the final leaderboard order from the leaderboard service.
- Protecting tiny domains from distributional inference once global order is known.
- Matching the privacy level of Invite PK's two-party MPC flow.

## Product Implication

Securecompare documentation must describe leaderboard mode separately from Invite PK. Invite PK can be presented as a strong two-party private comparison flow. Leaderboard mode should be described as encrypted sortable submission: the server should not learn raw submitted values, but it necessarily learns order.
