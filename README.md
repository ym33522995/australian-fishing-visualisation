# Recreational Fishing in Australia

A single-page dashboard exploring Australian recreational fishing through participation, wellbeing, catches, places, and employment. Built for FIT3179 Data Visualisation 2 using ten Vega-Lite/Vega visualisations.

Author: Miura. Creation date: 15 October 2026.

## Run locally

Serve the repository root using VS Code Live Server or a local HTTP server. For example, with Python installed:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. Use HTTP rather than opening `index.html` directly: the charts fetch local specifications and datasets.

There is no build step or package installation for the dashboard. Internet access is needed for the pinned Vega libraries loaded from jsDelivr.

## Dashboard sections

| Section | Visualisations |
| --- | --- |
| Participation and Wellbeing | State participation, urban-regional participation, fishing frequency and wellbeing, direct employment |
| Species and Changes | Queensland retained/released catch ranking and historical catch trends |
| Places and Trip Planning | Species records, NSW effort by waterbody, Moreton Bay facilities, Australian seabed contours |

Each section ends with an infographic-style summary. Numbered chart labels correspond to source labels in the References section. The footer identifies the author and creation date.

## Project structure

```text
index.html             Page content, chart containers, references, and footer
css/style.css          Typography, layout, chart cards, and summary styling
js/visualisations.js   Chart loading, responsive sizing, map controls, and reset
specs/                 Ten readable Vega-Lite JSON specifications
data/csv/              Prepared tabular datasets and retained source tables
data/geojson/          Geographic boundaries, contour lines, labels, and cells
```

The repository contains the prepared data needed to render the dashboard, plus three retained source/archive files listed below. Preparation scripts, verification scripts, JSON audit records, compressed elevation samples, extracted text tables, Markdown source notes, PDF archives, and XML metadata are no longer included.

## Chart specifications and active data

| Chart | Specification | Prepared data |
| --- | --- | --- |
| State participation | [participation-map.json](specs/participation-map.json) | `participation_by_state.csv`; state boundaries |
| Urban-regional participation | [urban-regional-participation.json](specs/urban-regional-participation.json) | `urban_regional_participation.csv` |
| Fishing frequency and wellbeing | [fishing-frequency-wellbeing.json](specs/fishing-frequency-wellbeing.json) | `fishing-frequency-wellbeing.csv` |
| Direct employment | [direct-employment-map.json](specs/direct-employment-map.json) | `direct-employment-state-totals.csv`; state boundaries |
| Queensland catch ranking | [common-species-bar.json](specs/common-species-bar.json) | `queensland_recreational_catch_2019_20.csv` |
| Queensland catch trends | [queensland-catch-trends.json](specs/queensland-catch-trends.json) | `queensland-catch-trends.csv` |
| Recorded species locations | [species-occurrence-map.json](specs/species-occurrence-map.json) | `species_occurrence_locations.csv`; state boundaries |
| NSW fishing effort | [nsw-effort-by-waterbody.json](specs/nsw-effort-by-waterbody.json) | `nsw-effort-by-waterbody.csv` |
| Moreton Bay facilities | [fishing-facilities-map.json](specs/fishing-facilities-map.json) | `facility_grid_counts.csv`; local boundaries and grid cells |
| Australian seabed contours | [australia-depth-contours.json](specs/australia-depth-contours.json) | Depth overview, detailed contours, label points, annotations, and state boundaries |

CSV filenames above resolve under `data/csv/`; spatial files are under `data/geojson/`. Data URLs in specifications resolve relative to `index.html`.

The wellbeing specification is adapted and compiled into Vega by `visualisations.js` so each survey panel retains its own axes when the panels stack.

## Interaction and responsive layout

- Hover over marks for values and supporting details.
- Use dropdowns to select species, regions, facility types, catch categories, or contour detail where available.
- Scroll over the species, facilities, employment, and depth maps to zoom at the cursor. Click and drag to pan.
- Use each map's reset button to restore its original view. Scroll outside a map to move through the webpage.
- Focus the depth map to use `+`/`-` for zoom and arrow keys for panning.
- Paired cards align on wide screens. Charts stack on smaller screens; wellbeing panels share a 0-35% scale and retain separate axes.

## Data sources and retained files

The page's References section provides the source citations and URLs. Principal sources include the national recreational fishing survey, Fisheries Queensland, NSW DPIRD, Atlas of Living Australia, City of Moreton Bay, ABS, and GEBCO.

The dashboard reads nine CSV files and seven GeoJSON files through its specifications. It does not extract reports, generate source datasets, or run Python. All 16 referenced data files are included.

Three additional files remain as supporting inputs or archived data; the webpage does not load them:

| Retained file | Purpose |
| --- | --- |
| [boating_fishing_assets_raw.geojson](data/geojson/boating_fishing_assets_raw.geojson) | Original facility asset records used to prepare grid counts. |
| [recreational-fishing-direct-employment.csv](data/csv/recreational-fishing-direct-employment.csv) | Regional employment estimates used to derive the displayed state totals. |
| [recreational_catch_australia_2000_01.csv](data/csv/recreational_catch_australia_2000_01.csv) | Archived national catch data; the current ranking uses Queensland estimates instead. |

The deleted compressed elevation samples and table extracts are not needed to display the prepared charts. This version supports serving the existing dashboard, rather than rebuilding or automatically verifying its source datasets.

Species records cover four selected species during 2015-2025. Repeated observations at identical species-coordinate combinations are grouped into rows with record counts. The original ALA download is no longer bundled, so these prepared rows cannot be independently regenerated from this repository alone. Removing the preparation scripts also means the repository does not currently provide an automated data-rebuild workflow.

## Interpretation and current limitations

- The datasets describe different years, populations, and locations; they are not one combined national survey.
- Wellbeing associations do not establish that fishing improves wellbeing.
- Historical catch comparisons include survey-method changes and do not measure fish abundance directly.
- Species records do not predict catch success. Facility counts do not guarantee access. Depth contours are unsuitable for navigation.
- Selecting all eligible catch categories at a 320 px viewport can leave the ranking plot without usable width. The default Top 10 view and the wellbeing layout were checked separately.
- Detailed depth geometry is downloaded even when only overview contours are visible. Referenced chart data total approximately 8.6 MB before transfer compression, excluding JavaScript libraries.

## GitHub Pages

Publish the repository root through GitHub Pages and retain the relative folder structure. Confirm that the public page, all ten charts, and source links load before submitting the URL. Publishing is separate from running the local dashboard.
