# Content Provenance

Last verified against bundled content: 2026-06-06.

This file is the release gate for bundled source licensing. Every `source_id` in
`core/content/bundled-content.json` must appear here, and no beta source may ship
with an `unknown` license status.

| source_id | Work / tradition | Edition / translation policy | License status | License URL | Notes |
|---|---|---|---|---|---|
| i_ching | I Ching | Short Vietnamese app adaptation from public-domain hexagram traditions, not a copied modern translation. | public_domain_source_app_adaptation | https://www.gutenberg.org/ebooks/25501 | Do not add modern translated lines without attribution and license review. |
| tao_te_ching | Tao Te Ching | Short Vietnamese app adaptation from public-domain Tao Te Ching traditions, not a copied modern translation. | public_domain_source_app_adaptation | https://www.gutenberg.org/ebooks/216 | Keep references by chapter where possible. |
| bible_kjv | King James Version Bible | KJV English excerpts. Vietnamese resonance/context copy is app-authored. | public_domain | https://www.gutenberg.org/ebooks/10 | KJV status varies outside the US/UK; beta distribution review should confirm target regions. |
| hafez_divan | Hafez, Divan tradition | Short Vietnamese app adaptation inspired by public-domain Hafez material, not a copied modern translation. | public_domain_source_app_adaptation | https://www.gutenberg.org/ebooks/search/?query=hafez | Modern Hafez translations are commonly copyrighted; do not import them into bundled content. |
| rumi_masnavi | Rumi, Masnavi tradition | Short Vietnamese app adaptation inspired by public-domain Masnavi material, not a copied modern translation. | public_domain_source_app_adaptation | https://www.gutenberg.org/ebooks/search/?query=rumi | Modern Rumi translations are commonly copyrighted; do not import them into bundled content. |
| marcus_aurelius | Marcus Aurelius, Meditations | Short Vietnamese app adaptation from public-domain Stoic material. | public_domain_source_app_adaptation | https://www.gutenberg.org/ebooks/2680 | Keep future English excerpts tied to a public-domain edition. |

Release rule:

- New bundled sources require a row in this file before `pnpm release:report --check` can pass.
- Commercial wisdom packs need a separate signed license or clear public-domain edition record.
- Attribution copy should be updated before any store listing names a specific translator or edition.
