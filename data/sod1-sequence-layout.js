window.SOD1SequenceFigure = {
  viewBox: {
    width: 900,
    height: 523
  },
  lines: [
    {
      start: 1,
      xStart: 19,
      y: 150,
      numberY: 170,
      arrowY: 132,
      charWidth: 10.4,
      sequence:
        "ATKAVCVLKGDGPVQGIINFEQKESNGPVKVWGSIKGLTEGLHGFHVHEFGDNTAGCTSAGPHFNPLSRKHGGPKDEERH"
    },
    {
      start: 81,
      xStart: 19,
      y: 325,
      numberY: 345,
      arrowY: 317,
      charWidth: 10.4,
      sequence:
        "VGDLGNVTADKDGVADVSIEDSVISLSGDHCIIGRTLVVHEKADDLGKGGNEESTKTGNAGSRLACGVIGIAQ"
    }
  ],
  betaStrands: [
    { start: 4, end: 10 },
    { start: 15, end: 23 },
    { start: 29, end: 37 },
    { start: 43, end: 50 },
    { start: 54, end: 61 },
    { start: 64, end: 70 },
    { start: 104, end: 110 },
    { start: 145, end: 151 }
  ],
  legend: [
    { label: "Δ: deletion", color: "#222222" },
    { label: "*: stop codon", color: "#222222" },
    { label: "+: insertion", color: "#222222" },
    { label: "Black: wild-type sequence", color: "#222222" },
    {
      label: "Red: Recognized by MS antibodies and Derlin-1(CT4)-interactive",
      color: "#d62828"
    },
    {
      label: "Blue: NOT Recognized by MS antibodies and Derlin-1(CT4)-non-interactive",
      color: "#1971c2"
    },
    {
      label: "Green: Recognized by MS antibodies and Derlin-1(CT4)-non-interactive",
      color: "#2b8a3e"
    },
    {
      label: "Orange: NOT Recognized by MS antibodies and Derlin-1(CT4)-interactive",
      color: "#d97706"
    }
  ]
};
