# Cross-check workflow

Nezavisne provjere ključnih tvrdnji iz `research/01-05` putem **Claude Desktop Research feature**. Svrha: triangulacija na visokorizičnim brojkama / pozicijama, gdje nas pogreška može koštati boda ili ozbiljne strateške greške.

## Tri ciljane provjere

| # | Tema | Prompt | Placeholder za output |
|---|------|--------|----------------------|
| **A** | Tehničke brojke (UEFA / FIFA / NN) — verifikacija ~30 ključnih cifara | [`_prompt-A-tehnicki-brojke.md`](_prompt-A-tehnicki-brojke.md) | [`A-tehnicki-brojke-REPORT.md`](A-tehnicki-brojke-REPORT.md) |
| **B** | Predsjednik OS Toma Plejić + dopredsjednik Vasa Perović — dublji opus, recentni stavovi, izjave o stadionima | [`_prompt-B-plejic-perovic.md`](_prompt-B-plejic-perovic.md) | [`B-plejic-perovic-REPORT.md`](B-plejic-perovic-REPORT.md) |
| **C** | Konzervatorski operativni okvir — Z-1528 / Z-1530 / Z-6940, što je *zaista* dopušteno u kontaktnoj zoni parka | [`_prompt-C-konzervatorski.md`](_prompt-C-konzervatorski.md) | [`C-konzervatorski-REPORT.md`](C-konzervatorski-REPORT.md) |

## Workflow

1. Otvori **Claude Desktop**, novi razgovor.
2. Uključi **Research** (ikona povećala u alatnoj traci).
3. Otvori `_prompt-X-*.md`, kopiraj **cijeli sadržaj između markera `--- BEGIN PROMPT ---` i `--- END PROMPT ---`** i zalijepi u Desktop.
4. Pričekaj da Research završi (može trajati 10-30 min).
5. Kopiraj **cijeli output Desktopa** (uključujući citirane izvore) u odgovarajući `X-*-REPORT.md` placeholder, ispod oznake `<!-- PASTE HERE -->`.
6. Reci mi: *"Predaja: cross-check A gotov"* (ili B/C). Tada ću:
   - napraviti **diff** protiv postojećih izvještaja (`research/01-05`)
   - eksplicitno označiti **podudaranja (✓)**, **sukobe (⚠)** i **nove uvide (➕)**
   - ažurirati `SOT.md` u skladu s nalazima.

## Što NE pokrivamo cross-checkom

- Reference stadiona (`02`) — solidno pokriveno, dodatni izvještaj bi se 90% preklapao.
- Medijski narativ (`05`) — paywall-ovi i forumi su iscrpljeni; više vrijednosti ima direktan kontakt s DAZ-om.

Možeš pustiti **sva 3 prompta paralelno** u 3 nezavisne Desktop sesije — svaki ima drugačiji fokus, ne interferiraju.
