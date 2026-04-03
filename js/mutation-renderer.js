(() => {
  const data = window.SOD1MutationData;
  const wildTypeData = window.WildTypeGeneData;

  const listBody = document.getElementById("mutation-list-body");
  const searchInput = document.getElementById("mutation-search");
  const mutationCountBadge = document.getElementById("mutation-count-badge");
  const tableDetailBody = document.getElementById("selectedRow");
  const figureDetailBody = document.getElementById("mutation-figure-body");
  const wildTypeHeader = document.getElementById("wild-type-header");
  const wildTypeBody = document.getElementById("wild-type-body");

  const mutationMap =
    data && Array.isArray(data.mutations)
      ? new Map(data.mutations.map((item) => [item.mutation, item]))
      : new Map();

  function createDetailRow(item) {
    const row = document.createElement("tr");

    item.cells.forEach((cellHtml, index) => {
      const cell = document.createElement("td");

      if (index === 0) {
        cell.innerHTML = `${cellHtml}<br><span style="font-size: 12px; color: #6b7280;">${getProteinNotation(item.mutation)}</span>`;
      } else {
        cell.innerHTML = cellHtml;
      }

      row.appendChild(cell);
    });

    return row;
  }

  function renderPlaceholder(target) {
    if (!target) {
      return;
    }

    target.innerHTML =
      '<tr><td colspan="12">Select a mutation to view the details.</td></tr>';
  }

  function highlightSelectedMutation(mutation) {
    if (!listBody) {
      return;
    }

    listBody.querySelectorAll("[data-mutation]").forEach((row) => {
      row.classList.toggle("table-active", row.dataset.mutation === mutation);
    });
  }

  function getMutationPosition(mutation) {
    const match = mutation.match(/\d+/);
    return match ? match[0] : "";
  }

  function updateMutationCountBadge(visibleCount) {
    if (!mutationCountBadge || !data || !Array.isArray(data.mutations)) {
      return;
    }

    mutationCountBadge.textContent =
      visibleCount === data.mutations.length
        ? `${data.mutations.length} variants`
        : `${visibleCount} / ${data.mutations.length} variants`;
  }

  function getProteinNotation(mutation) {
    const match = mutation.match(/^([A-Za-z]+)(\d+)(.*)$/);

    if (!match) {
      return `p.${mutation}`;
    }

    const [, prefix, position, suffix] = match;
    return `p.${prefix}${Number(position) + 1}${suffix}`;
  }

  function filterMutationList(query) {
    if (!listBody) {
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    let visibleCount = 0;

    listBody.querySelectorAll("[data-mutation]").forEach((item) => {
      const isVisible =
        normalizedQuery === "" ||
        item.dataset.mutation.toLowerCase().includes(normalizedQuery) ||
        (item.dataset.proteinNotation || "").toLowerCase().includes(normalizedQuery);

      item.style.display = isVisible ? "" : "none";

      if (isVisible) {
        visibleCount += 1;
      }
    });

    updateMutationCountBadge(visibleCount);
  }

  function renderSelectedMutation(mutation) {
    const item = mutationMap.get(mutation);

    if (!item) {
      return;
    }

    [tableDetailBody, figureDetailBody].forEach((target) => {
      if (!target) {
        return;
      }

      target.innerHTML = "";
      target.appendChild(createDetailRow(item));
    });

    highlightSelectedMutation(mutation);
    document.dispatchEvent(
      new CustomEvent("sod1:mutation-selected", {
        detail: { mutation }
      })
    );
  }

  if (data && Array.isArray(data.mutations) && listBody) {
    const fragment = document.createDocumentFragment();

    data.mutations.forEach((item) => {
      const button = document.createElement("button");
      const mutationNameBlock = document.createElement("span");
      const mutationName = document.createElement("span");
      const mutationNameAlt = document.createElement("span");
      const mutationPosition = document.createElement("span");
      const position = getMutationPosition(item.mutation);
      const proteinNotation = getProteinNotation(item.mutation);

      button.type = "button";
      button.className = "mutation-list-item";
      button.dataset.mutation = item.mutation;
      button.dataset.proteinNotation = proteinNotation;

      mutationNameBlock.className = "mutation-name-block";
      mutationName.className = "mutation-name";
      mutationName.textContent = item.mutation;
      mutationNameAlt.className = "mutation-name-alt";
      mutationNameAlt.textContent = proteinNotation;
      mutationPosition.className = "mutation-position";
      mutationPosition.textContent = position || "NA";

      mutationNameBlock.appendChild(mutationName);
      mutationNameBlock.appendChild(mutationNameAlt);
      button.appendChild(mutationNameBlock);
      button.appendChild(mutationPosition);
      button.addEventListener("click", () => renderSelectedMutation(item.mutation));
      fragment.appendChild(button);
    });

    listBody.appendChild(fragment);
    updateMutationCountBadge(data.mutations.length);
  }

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      filterMutationList(event.target.value);
    });
  }

  if (mutationMap.size > 0) {
    renderPlaceholder(tableDetailBody);
    renderPlaceholder(figureDetailBody);
  }

  window.SoDCoDMutationUI = {
    mutationMap,
    renderSelectedMutation
  };

  if (
    wildTypeData &&
    Array.isArray(wildTypeData.columns) &&
    Array.isArray(wildTypeData.rows)
  ) {
    if (wildTypeHeader) {
      const headerRow = document.createElement("tr");
      headerRow.style.backgroundColor = "black";
      headerRow.style.color = "white";

      wildTypeData.columns.forEach((column) => {
        const headerCell = document.createElement("th");
        headerCell.textContent = column;
        headerRow.appendChild(headerCell);
      });

      wildTypeHeader.innerHTML = "";
      wildTypeHeader.appendChild(headerRow);
    }

    if (wildTypeBody) {
      const fragment = document.createDocumentFragment();

      wildTypeData.rows.forEach((cells) => {
        const row = document.createElement("tr");

        cells.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });

        fragment.appendChild(row);
      });

      wildTypeBody.innerHTML = "";
      wildTypeBody.appendChild(fragment);
    }
  }
})();
