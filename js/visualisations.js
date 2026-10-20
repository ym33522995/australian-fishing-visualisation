"use strict";

// Each key is a chart container ID in index.html.
// Ten working visualisations, with standalone local specifications and data.
// URLs resolve relative to index.html (not this JavaScript file), supporting
// both a local web server and GitHub Pages project URLs.
const chartSpecifications = {
  // Participation and Wellbeing: three implemented charts.
  "participation-chart-1": "specs/participation-map.json",
  "participation-chart-2": "specs/urban-regional-participation.json",
  "fishing-frequency-wellbeing": "specs/fishing-frequency-wellbeing.json",

  // Species and Changes: ranking and survey trends.
  "common-species-bar": "specs/common-species-bar.json",
  "species-catch-trend": "specs/queensland-catch-trends.json",

  // Places and Trip Planning: three maps and the NSW effort pie.
  "species-occurrence-map": "specs/species-occurrence-map.json",
  "nsw-effort-by-waterbody": "specs/nsw-effort-by-waterbody.json",
  "fishing-facilities-map": "specs/fishing-facilities-map.json",
  "water-depth-map": "specs/australia-depth-contours.json",
  "direct-employment-map": "specs/direct-employment-map.json"
};

// Plot dimensions measured in the pre-redesign 1100px content layout (HEAD).
// Width excludes axes/legends/padding; wellbeing uses its explicit subplot size.
const originalPlots = {
  "participation-chart-1": [1040, 325, 240],
  "participation-chart-2": [968, 217, 200],
  "common-species-bar": [929, 260, 260],
  "species-catch-trend": [990, 292, 220],
  "species-occurrence-map": [1040, 406, 240],
  "fishing-facilities-map": [1040, 388, 240],
  "nsw-effort-by-waterbody": [1040, 370, 280],
  "water-depth-map": [1040, 427, 260],
  "direct-employment-map": [1040, 359, 240]
};

const pairedPlots = [
  ["participation-chart-1", "participation-chart-2"],
  ["common-species-bar", "species-catch-trend"],
  ["nsw-effort-by-waterbody", "fishing-facilities-map"]
];
const plotLayouts = new Map();

function enableCursorNavigation(container, view, prefix, regionScale = () => 1) {
  const svg = container.querySelector("svg");
  container.classList.add("cursor-map");
  const clamp = value => Math.max(-1, Math.min(1, value));
  const zoomName = `${prefix}Zoom`;
  const xName = `${prefix}PanX`;
  const yName = `${prefix}PanY`;
  let drag;
  svg.addEventListener("wheel", event => {
    if (event.target.closest(".role-legend")) return;
    event.preventDefault();
    const oldZoom = view.signal(zoomName);
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? view.height() : 1);
    const zoom = Math.max(1, Math.min(6, oldZoom * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.003)));
    // Convert the cursor to plot coordinates, excluding SVG padding and legends.
    const plot = svg.querySelector(".mark-group.role-frame") || svg;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const anchor = point.matrixTransform(plot.getScreenCTM().inverse());
    const correction = (1 / zoom - 1 / oldZoom) / regionScale();
    view.signal(xName, clamp(view.signal(xName) + (anchor.x / view.width() - 0.5) * correction))
      .signal(yName, clamp(view.signal(yName) + (anchor.y / view.height() - 0.5) * correction))
      .signal(zoomName, zoom).runAsync().catch(console.error);
  }, { passive: false });
  svg.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest(".role-legend")) return;
    event.preventDefault();
    drag = { x: event.clientX, y: event.clientY, panX: view.signal(xName), panY: view.signal(yName) };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("is-panning");
  });
  svg.addEventListener("pointermove", event => {
    if (!drag) return;
    const zoom = view.signal(zoomName) * regionScale();
    view.signal(xName, clamp(drag.panX + (event.clientX - drag.x) / (view.width() * zoom)))
      .signal(yName, clamp(drag.panY + (event.clientY - drag.y) / (view.height() * zoom)))
      .runAsync().catch(console.error);
  });
  const finish = () => { drag = null; svg.classList.remove("is-panning"); };
  svg.addEventListener("pointerup", finish);
  svg.addEventListener("pointercancel", finish);
  svg.addEventListener("lostpointercapture", finish);
}

function observePlotSize(container, view, afterResize = () => {}) {
  const [originalWidth, originalHeight, minimumHeight] = originalPlots[container.id];
  view.signal("autosize", { type: "fit-x", contains: "padding", resize: true });
  let previousWidth = -1;
  let running = false;
  let pending = false;
  let frame;
  const resize = async () => {
    if (running) { pending = true; return; }
    running = true;
    try {
      do {
        pending = false;
        // First let Vega fit the available outer width, measuring actual plot
        // dimensions rather than guessing the space used by axes and legends.
        await view.resize().runAsync();
        for (let pass = 0; pass < 3; pass++) {
          let floor = minimumHeight;
          if (container.id === "common-species-bar") {
            const count = view.data("catch_rows").filter(row => row.chart_eligible === "yes").length;
            floor = 26 * (view.signal("catchRankingView") === "Top 10" ? Math.min(10, count) : count);
          }
          const heightLimit = Math.max(220, Math.min(340, window.innerHeight * 0.4));
          let plotHeight = Math.max(floor, Math.min(heightLimit, view.width() * originalHeight / originalWidth));
          const pair = pairedPlots.find(ids => ids.includes(container.id));
          if (pair && window.matchMedia("(min-width: 1280px)").matches) {
            // Match the complete SVG height, including each chart's axes and
            // legends, rather than just matching their internal plot heights.
            const ranking = plotLayouts.get("common-species-bar");
            let sharedHeight = Math.max(340, heightLimit);
            if (pair.includes("common-species-bar") && ranking) {
              const count = ranking.view.data("catch_rows").filter(row => row.chart_eligible === "yes").length;
              const rows = ranking.view.signal("catchRankingView") === "Top 10" ? Math.min(10, count) : count;
              sharedHeight = Math.max(sharedHeight, rows * 26 + 100);
            }
            const svgHeight = container.querySelector("svg").getBoundingClientRect().height;
            plotHeight = Math.max(120, sharedHeight - (svgHeight - view.height()));
            const layout = plotLayouts.get(container.id);
            if (layout.sharedHeight !== sharedHeight) {
              layout.sharedHeight = sharedHeight;
              pair.filter(id => id !== container.id).forEach(id => plotLayouts.get(id)?.schedule());
            }
          }
          if (Math.abs(view.height() - plotHeight) < 1) break;
          // fit-x lets axes and legends grow outside the plot naturally.
          view.height(plotHeight);
          await view.resize().runAsync();
        }
        container.dataset.plotWidth = String(view.width());
        container.dataset.plotHeight = String(view.height());
        await afterResize();
      } while (pending);
    } finally { running = false; }
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => resize().catch(console.error));
  };
  plotLayouts.set(container.id, { view, schedule });
  new ResizeObserver(() => {
    const width = container.clientWidth;
    if (width === previousWidth) return;
    previousWidth = width;
    schedule();
  }).observe(container);
  window.addEventListener("resize", schedule);
  return schedule;
}

// Embed only existing specifications, following the FIT3179 choropleth example:
// https://github.com/FIT3179/Vega-Lite/tree/main/3_choropleth_map
// Each substantive visualisation has one container and one embed function.
const mapContainer = document.getElementById("participation-chart-1");

async function embedParticipationMap() {
  try {
    const response = await fetch(chartSpecifications["participation-chart-1"]);
    if (!response.ok) throw new Error(`Specification HTTP ${response.status}`);
    const specification = await response.json();
    // Wrap the existing title so its text does not consume the map's plot width
    // when Vega measures decorations on a phone. Font sizes remain unchanged.
    specification.title.text = ["Where is recreational fishing", "most popular?"];
    const { view } = await vegaEmbed("#participation-chart-1", specification,
      { actions: false, renderer: "svg" });

    observePlotSize(mapContainer, view);
  } catch (error) {
    mapContainer.textContent = "The participation map could not be loaded. Please reload the page.";
    console.error("Unable to load participation map:", error);
  }
}

embedParticipationMap();

async function embedParticipationComparison() {
  const container = document.getElementById("participation-chart-2");
  try {
    const { view } = await vegaEmbed(
      "#participation-chart-2",
      chartSpecifications["participation-chart-2"],
      { actions: false, renderer: "svg" }
    );
    observePlotSize(container, view);
  } catch (error) {
    container.textContent = "The participation comparison could not be loaded. Please reload the page.";
    console.error("Unable to load participation comparison:", error);
  }
}

embedParticipationComparison();

async function embedSpeciesOccurrences() {
  const container = document.getElementById("species-occurrence-map");
  const reset = document.getElementById("reset-species-map");
  try {
    const { view } = await vegaEmbed(
      "#species-occurrence-map",
      chartSpecifications["species-occurrence-map"],
      { actions: false, renderer: "svg" }
    );
    observePlotSize(container, view);
    enableCursorNavigation(container, view, "map", () => view.signal("mapRegion") === "Australia" ? 1 : 2.5);
    // A focus preset starts centered, even after exploring another region.
    view.addSignalListener("mapRegion", () => {
      // Finish the current dataflow before applying the recentering update.
      requestAnimationFrame(() => {
        view.signal("mapPanX", 0).signal("mapPanY", 0).runAsync().catch(console.error);
      });
    });
    reset.disabled = false;
    reset.addEventListener("click", () => {
      view.signal("selectedSpecies", "All four species")
        .signal("mapRegion", "Australia").signal("mapZoom", 1)
        .signal("mapPanX", 0).signal("mapPanY", 0)
        .runAsync().catch(console.error);
    });
  } catch (error) {
    container.textContent = "Species locations could not be loaded. Please reload the page.";
    console.error("Unable to load species occurrences:", error);
  }
}

embedSpeciesOccurrences();

async function embedFishingFacilities() {
  const container = document.getElementById("fishing-facilities-map");
  const reset = document.getElementById("reset-facilities-map");
  const caption = document.getElementById("fishing-facilities-caption");
  try {
    const { view } = await vegaEmbed("#fishing-facilities-map",
      chartSpecifications["fishing-facilities-map"], { actions: false, renderer: "svg" });
    const updateCaption = () => {
      const category = view.signal("facilityType");
      // Vega-Lite may apply filters directly to this named data source.
      // Read the current rows after the selection's dataflow has finished.
      const count = view.data("facility_cells")
        .filter((row) => row.facility_category === category)
        .reduce((total, row) => total + Number(row.asset_count), 0);
      caption.textContent = count ? `${category}: ${count.toLocaleString()} asset records.`
        : `${category}: no asset records in this dataset.`;
    };
    updateCaption();
    view.addSignalListener("facilityType", () => requestAnimationFrame(updateCaption));
    observePlotSize(container, view);
    enableCursorNavigation(container, view, "facilities");
    reset.disabled = false;
    reset.addEventListener("click", () => {
      view.signal("facilityType", "All facilities").signal("facilitiesZoom", 1)
        .signal("facilitiesPanX", 0).signal("facilitiesPanY", 0).runAsync().catch(console.error);
    });
  } catch (error) {
    container.textContent = "Facility counts could not be loaded. Please reload the page.";
    console.error("Unable to load fishing facilities:", error);
  }
}

embedFishingFacilities();

async function embedCatchRanking() {
  const container = document.getElementById("common-species-bar");
  try {
    const { view } = await vegaEmbed("#common-species-bar",
      chartSpecifications["common-species-bar"], { actions: false, renderer: "svg" });
    const scheduleResize = observePlotSize(container, view);
    view.addSignalListener("catchRankingView", scheduleResize);
  } catch (error) {
    container.textContent = "Catch estimates could not be loaded. Please reload the page.";
    console.error("Unable to load catch ranking:", error);
  }
}

embedCatchRanking();

async function embedCatchTrends() {
  const container = document.getElementById("species-catch-trend");
  try {
    const { view } = await vegaEmbed("#species-catch-trend",
      chartSpecifications["species-catch-trend"], { actions: false, renderer: "svg" });
    observePlotSize(container, view);
  } catch (error) {
    container.textContent = "Catch trends could not be loaded. Please reload the page.";
    console.error("Unable to load Queensland catch trends:", error);
  }
}

embedCatchTrends();

async function embedDepthContours() {
  const container = document.getElementById("water-depth-map");
  const status = document.getElementById("depth-map-status");
  const reset = document.getElementById("reset-depth-map");
  try {
    const { view } = await vegaEmbed("#water-depth-map",
      chartSpecifications["water-depth-map"], { actions: false, renderer: "svg" });
    const svg = container.querySelector("svg");
    let drag = null;
    let frame = null;
    const limitPan = (value, zoom, axis = "x") => {
      const baseScale = Math.min((view.width() - 32) / 0.94, (view.height() - 32) / 0.80);
      const size = axis === "x" ? view.width() : view.height();
      const extent = axis === "x" ? 0.94 : 0.80;
      const limit = zoom <= 1 ? 0 : Math.max(0, (baseScale * extent * zoom / size - 1) / 2);
      return Math.max(-limit, Math.min(limit, value));
    };
    const update = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        view.runAsync().then(() => {
          const zoom = view.signal("depthZoom");
          status.textContent = `${zoom.toFixed(1)}\u00d7 zoom. Scroll to zoom; drag to pan.`;
        }).catch(console.error);
      });
    };
    const setZoom = (value, anchor = [0, 0]) => {
      const oldZoom = view.signal("depthZoom");
      const zoom = Math.max(1, Math.min(8, value));
      const ratio = zoom / oldZoom;
      view.signal("depthZoom", zoom)
        .signal("depthPanX", limitPan(anchor[0] - (anchor[0] - view.signal("depthPanX")) * ratio, zoom))
        .signal("depthPanY", limitPan(anchor[1] - (anchor[1] - view.signal("depthPanY")) * ratio, zoom, "y"));
      update();
    };
    const finishDrag = () => {
      if (drag && svg.hasPointerCapture(drag.id)) svg.releasePointerCapture(drag.id);
      drag = null;
      container.classList.remove("is-panning");
    };
    container.classList.add("is-exploring");
    reset.disabled = false;
    reset.addEventListener("click", () => {
      view.signal("depthZoom", 1).signal("depthPanX", 0).signal("depthPanY", 0)
        .signal("depthDetail", "Major contours");
      finishDrag();
      update();
    });
    // Cursor navigation is available immediately, without an activation step.
    svg.addEventListener("wheel", (event) => {
      if (event.target.closest(".role-legend")) return;
      event.preventDefault();
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const plot = svg.querySelector(".mark-group.role-frame") || svg;
      const anchor = point.matrixTransform(plot.getScreenCTM().inverse());
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? view.height() : 1);
      setZoom(view.signal("depthZoom") * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.003),
        [anchor.x / view.width() - 0.5,
         anchor.y / view.height() - 0.5]);
    }, { passive: false });
    svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".role-legend")) return;
      event.preventDefault();
      container.focus({ preventScroll: true });
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
        panX: view.signal("depthPanX"), panY: view.signal("depthPanY") };
      svg.setPointerCapture(event.pointerId);
      container.classList.add("is-panning");
    });
    svg.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const zoom = view.signal("depthZoom");
      view.signal("depthPanX", limitPan(drag.panX + (event.clientX - drag.x)/view.width(), zoom))
        .signal("depthPanY", limitPan(drag.panY + (event.clientY - drag.y)/view.height(), zoom, "y"));
      update();
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) svg.addEventListener(name, finishDrag);
    container.addEventListener("keydown", (event) => {
      if (event.target !== container) return;
      if (["+", "=", "-"].includes(event.key)) {
        event.preventDefault();
        setZoom(view.signal("depthZoom") * (event.key === "-" ? 1/1.35 : 1.35));
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const zoom = view.signal("depthZoom");
        const dx = event.key === "ArrowLeft" ? 0.08 : event.key === "ArrowRight" ? -0.08 : 0;
        const dy = event.key === "ArrowUp" ? 0.08 : event.key === "ArrowDown" ? -0.08 : 0;
        view.signal("depthPanX", limitPan(view.signal("depthPanX") + dx, zoom))
          .signal("depthPanY", limitPan(view.signal("depthPanY") + dy, zoom, "y"));
        update();
      }
    });
    observePlotSize(container, view, () => {
      const zoom = view.signal("depthZoom");
      view.signal("depthPanX", limitPan(view.signal("depthPanX"), zoom))
        .signal("depthPanY", limitPan(view.signal("depthPanY"), zoom, "y"));
      update();
    });
    update();
  } catch (error) {
    container.textContent = "Depth contours could not be loaded. Please reload the page.";
    console.error("Unable to load depth contours:", error);
  }
}

embedDepthContours();

async function embedNswEffort() {
  const container = document.getElementById("nsw-effort-by-waterbody");
  try {
    const { view } = await vegaEmbed("#nsw-effort-by-waterbody",
      chartSpecifications["nsw-effort-by-waterbody"], { actions: false, renderer: "svg" });
    observePlotSize(container, view);
  } catch (error) {
    container.textContent = "NSW effort shares could not be loaded. Please reload the page.";
    console.error("Unable to load NSW effort shares:", error);
  }
}

embedNswEffort();

async function embedFishingWellbeing() {
  const container = document.getElementById("fishing-frequency-wellbeing");
  try {
    const response = await fetch(chartSpecifications["fishing-frequency-wellbeing"]);
    if (!response.ok) throw new Error(`Specification HTTP ${response.status}`);
    const specification = await response.json();
    // Keep each panel's axes inside its own group. Facet column footers retain
    // their original column positions when the layout wraps to one column.
    const adapted = {
      data: specification.data,
      transform: specification.transform,
      concat: specification.facet.sort.map((survey, index) => {
        const panel = JSON.parse(JSON.stringify(specification.spec));
        panel.transform = [{ filter: { field: "survey", equal: survey } }, ...(panel.transform || [])];
        panel.encoding.x.axis.title = ['Days fished in the', 'previous 12 months'];
        panel.title = {
          text: index === 0 ? ['2018 Regional', 'Wellbeing Survey'] : ['2019\u201320 NRFS Stage 2'],
          fontSize: 13, fontWeight: 'normal', color: '#20343e', anchor: 'middle'
        };
        return panel;
      }),
      columns: 2,
      spacing: 30,
      resolve: { scale: { x: 'independent', y: 'shared' }, axis: { y: 'independent' } },
      config: specification.config
    };
    const compiled = vegaLite.compile(adapted).spec;
    compiled.signals.push({ name: "subplotWidth", value: 400 }, { name: "subplotColumns", value: 2 });
    for (const signal of compiled.signals) {
      if (signal.name === "childWidth" || /^concat_\d+_width$/.test(signal.name)) { delete signal.value; signal.update = "subplotWidth"; }
      if (signal.name === "childHeight" || /^concat_\d+_height$/.test(signal.name)) { delete signal.value; signal.update = "max(180, min(240, subplotWidth * 240 / 400))"; }
    }
    const responsiveLayout = (node) => {
      if (node.layout && node.layout.columns !== undefined) node.layout.columns = { signal: "subplotColumns" };
      for (const mark of node.marks || []) responsiveLayout(mark);
    };
    responsiveLayout(compiled);
    const { view } = await vegaEmbed(container, compiled, { actions: false, renderer: "svg", mode: "vega" });
    let previousWidth = -1;
    let frame;
    let running = false;
    let pending = false;
    const resize = async () => {
      if (running) { pending = true; return; }
      running = true;
      try {
        do {
          pending = false;
          const width = container.clientWidth;
          const columns = width >= 800 ? 2 : 1;
          // Measure complete axes and titles rather than clipping the SVG.
          let plotWidth = Math.max(120, (width - 75 * columns - 30 * (columns - 1)) / columns);
          view.signal("subplotColumns", columns).signal("subplotWidth", plotWidth);
          await view.resize().runAsync();
          for (let pass = 0; pass < 3; pass++) {
            const outerWidth = container.querySelector("svg").getBoundingClientRect().width;
            if (Math.abs(width - outerWidth - 2) < 1) break;
            plotWidth = Math.max(120, plotWidth + (width - outerWidth - 2) / columns);
            await view.signal("subplotWidth", plotWidth).resize().runAsync();
          }
          container.dataset.plotWidth = String(plotWidth);
          container.dataset.plotHeight = String(Math.max(180, Math.min(240, plotWidth * 0.6)));
          container.dataset.renderWidth = String(width);
        } while (pending);
      } finally { running = false; }
    };
    new ResizeObserver(() => {
      const width = container.clientWidth;
      if (width === previousWidth) return;
      previousWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => resize().catch(error => console.error("Unable to resize wellbeing panels:", error)));
    }).observe(container);
  } catch (error) {
    container.textContent = "Wellbeing estimates could not be loaded. Please reload the page.";
    console.error("Unable to load fishing wellbeing:", error);
  }
}

embedFishingWellbeing();

async function embedDirectEmployment() {
  const container = document.getElementById("direct-employment-map");
  const reset = document.getElementById("reset-employment-map");
  try {
    const { view } = await vegaEmbed("#direct-employment-map",
      chartSpecifications["direct-employment-map"], { actions: false, renderer: "svg" });
    observePlotSize(container, view);
    enableCursorNavigation(container, view, "employment");
    reset.disabled = false;
    reset.addEventListener("click", () => {
      view.signal("employmentState", "All Australia").signal("employmentZoom", 1)
        .signal("employmentPanX", 0).signal("employmentPanY", 0)
        .runAsync().catch(console.error);
    });
  } catch (error) {
    container.textContent = "Direct employment estimates could not be loaded. Please reload the page.";
    console.error("Unable to load direct employment:", error);
  }
}

embedDirectEmployment();
