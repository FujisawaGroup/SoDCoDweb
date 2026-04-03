(() => {
  const data = window.SOD1MutationData;
  const layout = window.SOD1SequenceFigure;
  const figureContainer = document.getElementById("sod1-sequence-figure");
  const mutationUI = window.SoDCoDMutationUI;

  if (
    !figureContainer ||
    !data ||
    !Array.isArray(data.mutations) ||
    !Array.isArray(data.areas) ||
    !layout
  ) {
    return;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const colorMap = {
    red: "#d62828",
    blue: "#1971c2",
    green: "#2b8a3e",
    orange: "#d97706"
  };
  const HORIZONTAL_STRETCH = 1.06;
  const VIEWBOX_PADDING_X = 24;

  const areaMap = new Map(data.areas.map((item) => [item.mutation, item]));
  const mutationTexts = new Map();
  const residueXMap = buildResidueXMap();
  const mutationYBands = buildMutationYBands();

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);

    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    return element;
  }

  function parseMutation(mutation) {
    const match = mutation.match(/^([A-Z])(\d+)(.+)$/);

    if (!match) {
      return null;
    }

    return {
      wildType: match[1],
      position: Number(match[2]),
      change: match[3]
    };
  }

  function formatMutationLabel(mutation) {
    const parsed = parseMutation(mutation);

    if (!parsed) {
      return mutation;
    }

    if (parsed.change === "del") {
      return "Δ";
    }

    return parsed.change;
  }

  function splitMutationLabel(label) {
    const match = label.match(/^([A-Za-zΔ+*]+)(\d+)$/);

    if (!match) {
      return null;
    }

    return {
      main: match[1],
      subscript: match[2]
    };
  }

  function getMutationColor(cells) {
    const recognized = cells.slice(1, 4).some((value) => value === "Yes");
    const interactive = cells[4] === "Yes";

    if (recognized && interactive) {
      return colorMap.red;
    }

    if (recognized && !interactive) {
      return colorMap.green;
    }

    if (!recognized && interactive) {
      return colorMap.orange;
    }

    return colorMap.blue;
  }

  function getLineForPosition(position) {
    return layout.lines.find((line) => {
      const lineEnd = line.start + line.sequence.length - 1;
      return position >= line.start && position <= lineEnd;
    });
  }

  function getAreaCenter(area) {
    const [x1, y1, x2, y2] = area.coords.split(",").map(Number);

    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2
    };
  }

  function buildResidueXMap() {
    const positions = new Map();

    data.areas.forEach((area) => {
      const parsed = parseMutation(area.mutation);

      if (!parsed) {
        return;
      }

      const center = getAreaCenter(area);
      const xs = positions.get(parsed.position) || [];
      xs.push(center.x);
      positions.set(parsed.position, xs);
    });

    const averaged = new Map(
      Array.from(positions.entries()).map(([position, xs]) => [
        position,
        xs.reduce((sum, value) => sum + value, 0) / xs.length
      ])
    );

    layout.lines.forEach((line) => {
      const lineEnd = line.start + line.sequence.length - 1;
      const knownPositions = [];

      for (let position = line.start; position <= lineEnd; position += 1) {
        if (averaged.has(position)) {
          knownPositions.push(position);
        }
      }

      const spacings = [];
      for (let index = 1; index < knownPositions.length; index += 1) {
        const prev = knownPositions[index - 1];
        const current = knownPositions[index];
        const spacing =
          (averaged.get(current) - averaged.get(prev)) / (current - prev);
        spacings.push(spacing);
      }

      const fallbackSpacing =
        spacings.length > 0
          ? spacings.reduce((sum, value) => sum + value, 0) / spacings.length
          : line.charWidth;

      for (let position = line.start; position <= lineEnd; position += 1) {
        if (averaged.has(position)) {
          continue;
        }

        const prev = [...knownPositions].reverse().find((value) => value < position);
        const next = knownPositions.find((value) => value > position);

        if (prev !== undefined && next !== undefined) {
          const ratio = (position - prev) / (next - prev);
          averaged.set(
            position,
            averaged.get(prev) + (averaged.get(next) - averaged.get(prev)) * ratio
          );
          continue;
        }

        if (prev !== undefined) {
          averaged.set(position, averaged.get(prev) + (position - prev) * fallbackSpacing);
          continue;
        }

        if (next !== undefined) {
          averaged.set(position, averaged.get(next) - (next - position) * fallbackSpacing);
          continue;
        }

        averaged.set(position, line.xStart + (position - line.start) * line.charWidth);
      }
    });

    return averaged;
  }

  function buildMutationYBands() {
    const bandsByLine = new Map();

    layout.lines.forEach((line) => {
      bandsByLine.set(line.start, []);
    });

    data.areas.forEach((area) => {
      const parsed = parseMutation(area.mutation);

      if (!parsed) {
        return;
      }

      const line = getLineForPosition(parsed.position);

      if (!line) {
        return;
      }

      bandsByLine.get(line.start).push(getAreaCenter(area).y);
    });

    const clusteredBands = new Map();

    bandsByLine.forEach((values, lineStart) => {
      const sorted = values.slice().sort((a, b) => a - b);
      const clusters = [];

      sorted.forEach((value) => {
        const cluster = clusters[clusters.length - 1];

        if (!cluster || Math.abs(cluster.center - value) > 7) {
          clusters.push({ values: [value], center: value });
          return;
        }

        cluster.values.push(value);
        cluster.center =
          cluster.values.reduce((sum, current) => sum + current, 0) /
          cluster.values.length;
      });

      clusteredBands.set(
        lineStart,
        clusters.map((cluster) => cluster.center)
      );
    });

    return clusteredBands;
  }

  function getResidueX(line, position) {
    const rawX =
      residueXMap.get(position) ?? line.xStart + (position - line.start) * line.charWidth;

    return getDisplayX(position, rawX);
  }

  function getDisplayX(position, rawX) {
    const line = getLineForPosition(position);

    if (!line) {
      return rawX;
    }

    const lineEnd = line.start + line.sequence.length - 1;
    const startX =
      residueXMap.get(line.start) ?? line.xStart;
    const endX =
      residueXMap.get(lineEnd) ?? line.xStart + (lineEnd - line.start) * line.charWidth;
    const centerX = (startX + endX) / 2;

    return centerX + (rawX - centerX) * HORIZONTAL_STRETCH;
  }

  function getAlignedMutationY(position, rawY) {
    const line = getLineForPosition(position);

    if (!line) {
      return rawY;
    }

    const bands = mutationYBands.get(line.start) || [];

    if (bands.length === 0) {
      return rawY;
    }

    return bands.reduce((closest, current) =>
      Math.abs(current - rawY) < Math.abs(closest - rawY) ? current : closest
    );
  }

  function renderSequence(svg) {
    layout.lines.forEach((line) => {
      line.sequence.split("").forEach((residue, index) => {
        const position = line.start + index;
        const text = createSvgElement("text", {
          x: getResidueX(line, position),
          y: line.y,
          class: "sequence-char"
        });

        text.textContent = residue;
        svg.appendChild(text);

        if (position % 10 === 0) {
          const number = createSvgElement("text", {
            x: getResidueX(line, position),
            y: line.numberY,
            class: "sequence-number"
          });

          number.textContent = String(position);
          svg.appendChild(number);
        }
      });
    });
  }

  function renderLegend(svg) {
    const legendGroup = createSvgElement("g", {
      transform: "translate(105 392)"
    });

    layout.legend.forEach((item, index) => {
      const legendText = createSvgElement("text", {
        x: 0,
        y: index * 20,
        fill: item.color,
        class: "legend-text"
      });

      legendText.textContent = item.label;
      legendGroup.appendChild(legendText);
    });

    svg.appendChild(legendGroup);
  }

  function renderMutations(svg) {
    data.mutations.forEach((item) => {
      const area = areaMap.get(item.mutation);

      if (!area) {
        return;
      }

      const center = getAreaCenter(area);
      const parsed = parseMutation(item.mutation);
      const label = formatMutationLabel(item.mutation);
      const labelParts = splitMutationLabel(label);
      const x = parsed ? getDisplayX(parsed.position, center.x) : center.x;
      const y = parsed ? getAlignedMutationY(parsed.position, center.y) : center.y;
      const color = getMutationColor(item.cells);
      const labelElement = createSvgElement("g", {
        class: "mutation-label",
        "data-mutation": item.mutation
      });

      if (labelParts) {
        const mainText = createSvgElement("text", {
          x: String(x),
          y: String(y),
          fill: color,
          class: "mutation-label-main"
        });
        const subscriptText = createSvgElement("text", {
          x: String(x + 4),
          y: String(y + 5),
          fill: color,
          class: "mutation-label-subscript"
        });

        mainText.textContent = labelParts.main;
        subscriptText.textContent = labelParts.subscript;
        labelElement.appendChild(mainText);
        labelElement.appendChild(subscriptText);
      } else {
        const text = createSvgElement("text", {
          x: String(x),
          y: String(y),
          fill: color,
          class: "mutation-label-main"
        });

        text.textContent = label;
        labelElement.appendChild(text);
      }

      labelElement.addEventListener("click", () => {
        if (mutationUI && typeof mutationUI.renderSelectedMutation === "function") {
          mutationUI.renderSelectedMutation(item.mutation);
        }
      });

      svg.appendChild(labelElement);
      mutationTexts.set(item.mutation, labelElement);
    });
  }

  function renderFigure() {
    const svg = createSvgElement("svg", {
      viewBox: `${-VIEWBOX_PADDING_X} 0 ${layout.viewBox.width + VIEWBOX_PADDING_X * 2} ${layout.viewBox.height}`,
      width: "100%",
      role: "img",
      "aria-label": "Interactive SOD1 mutation diagram"
    });

    const defs = createSvgElement("defs");
    const style = createSvgElement("style");

    style.textContent = `
      .sequence-char {
        fill: #222222;
        font-family: "Courier New", Courier, monospace;
        font-size: 18px;
        font-weight: 700;
        text-anchor: middle;
        dominant-baseline: middle;
        font-kerning: none;
        font-variant-ligatures: none;
      }
      .sequence-number {
        fill: #222222;
        font-family: Arial, sans-serif;
        font-size: 11px;
        text-anchor: middle;
        dominant-baseline: middle;
      }
      .mutation-label {
        cursor: pointer;
      }
      .mutation-label-main {
        font-family: Arial, sans-serif;
        font-size: 15px;
        font-weight: 700;
        text-anchor: middle;
        dominant-baseline: middle;
      }
      .mutation-label-subscript {
        font-family: Arial, sans-serif;
        font-size: 10px;
        font-weight: 700;
        text-anchor: start;
        dominant-baseline: middle;
      }
      .mutation-label:hover .mutation-label-main,
      .mutation-label.selected .mutation-label-main {
        text-decoration: underline;
      }
      .legend-text {
        font-family: Arial, sans-serif;
        font-size: 9px;
        font-weight: 600;
      }
    `;

    defs.appendChild(style);
    svg.appendChild(defs);
    svg.appendChild(
      createSvgElement("rect", {
        x: "0",
        y: "0",
        width: String(layout.viewBox.width),
        height: String(layout.viewBox.height),
        fill: "#ffffff"
      })
    );

    renderSequence(svg);
    renderMutations(svg);
    renderLegend(svg);

    figureContainer.innerHTML = "";
    figureContainer.appendChild(svg);
  }

  document.addEventListener("sod1:mutation-selected", (event) => {
    mutationTexts.forEach((text, mutation) => {
      text.classList.toggle("selected", mutation === event.detail.mutation);
    });
  });

  renderFigure();
})();
