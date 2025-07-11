// Ladda och förbered CSV-data
d3.dsv(";", "balkongdata.csv", row => {
  const clean = {};
  for (let key in row) {
    const val = row[key]?.trim().replace(",", ".");
    clean[key.trim()] = val;
  }
  return {
    Tid: new Date(clean["Datum"]),
    Temperatur: parseFloat(clean["Temperatur"]),
    PosTemperatur: parseFloat(clean["PosTemperatur"]),
    Luftfuktighet: parseFloat(clean["Luftfuktighet"]),
    PosLuftFuktighet: parseFloat(clean["PosLuftFuktighet"]),
    Lufttryck: parseFloat(clean["Lufttryck"]),
    PosLufttryck: parseFloat(clean["PosLufttryck"]),
    UV: parseFloat(clean["PosUvIndex"]),
    Vind: parseFloat(clean["PosVindstyrka"]),
    Jord1: parseFloat(clean["Jordfukt låda 1"]),
    Jord2: parseFloat(clean["Jordfukt låda 2"]),
    Jord3: parseFloat(clean["Jordfukt låda 3"])
  };
}).then(data => {
  const filtered = data.filter(d => !Object.values(d).some(v => isNaN(v)));

  const färger = {
    Temperatur: "tomato",
    PosTemperatur: "steelblue",
    Luftfuktighet: "skyblue",
    PosLuftFuktighet: "gray",
    Lufttryck: "seagreen",
    PosLufttryck: "goldenrod",
    Jord1: "saddlebrown",
    Jord2: "darkolivegreen",
    Jord3: "darkcyan",
    UV: "gold"
  };

  // Diagramfunktion för 2-serie-diagram
  function ritaDiagram(id, lokalKey, posKey, legendId) {
    const svg = d3.select("#" + id).append("svg");
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = svg.node().clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(filtered, d => d.Tid)).range([0, width]);
    const y = d3.scaleLinear().domain([
      d3.min(filtered, d => Math.min(d[lokalKey], d[posKey])) * 0.95,
      d3.max(filtered, d => Math.max(d[lokalKey], d[posKey])) * 1.05
    ]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    const line = key => d3.line().x(d => x(d.Tid)).y(d => y(d[key]));

    g.append("path").datum(filtered).attr("fill", "none")
      .attr("stroke", färger[lokalKey]).attr("stroke-width", 2).attr("d", line(lokalKey));

    g.append("path").datum(filtered).attr("fill", "none")
      .attr("stroke", färger[posKey]).attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4").attr("d", line(posKey));

    d3.select("#" + legendId).html(`
      <div><span style="background:${färger[lokalKey]}"></span> Lokal</div>
      <div><span style="background:${färger[posKey]}; border:1px dashed #333"></span> POS</div>
    `);
  }

  ritaDiagram("temperatur", "Temperatur", "PosTemperatur", "legend-temperatur");
  ritaDiagram("luftfuktighet", "Luftfuktighet", "PosLuftFuktighet", "legend-luftfuktighet");
  ritaDiagram("lufttryck", "Lufttryck", "PosLufttryck", "legend-lufttryck");

  // Jordfuktighet
  const svg = d3.select("#jordfukt").append("svg");
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = svg.node().clientWidth - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleTime().domain(d3.extent(filtered, d => d.Tid)).range([0, width]);
  const y = d3.scaleLinear().domain([
    d3.min(filtered, d => Math.min(d.Jord1, d.Jord2, d.Jord3)) * 0.95,
    d3.max(filtered, d => Math.max(d.Jord1, d.Jord2, d.Jord3)) * 1.05
  ]).range([height, 0]);

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  ["Jord1", "Jord2", "Jord3"].forEach(key => {
    const line = d3.line().x(d => x(d.Tid)).y(d => y(d[key]));
    g.append("path").datum(filtered).attr("fill", "none")
      .attr("stroke", färger[key]).attr("stroke-width", 2).attr("d", line);
  });

  d3.select("#legend-jordfukt").html(`
    <div><span style="background:${färger.Jord1}"></span> Låda 1</div>
    <div><span style="background:${färger.Jord2}"></span> Låda 2</div>
    <div><span style="background:${färger.Jord3}"></span> Låda 3</div>
  `);

  // UV-diagram
  function ritaUvDiagram() {
    const svg = d3.select("#uvdiagram").append("svg");
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = svg.node().clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(filtered, d => d.Tid)).range([0, width]);
    const y = d3.scaleLinear().domain([0, 12]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    const uvZoner = [
      { gräns: 2, färg: "#a8e6cf", etikett: "Låg" },
      { gräns: 5, färg: "#dcedc1", etikett: "Måttlig" },
      { gräns: 7, färg: "#ffd3b6", etikett: "Hög" },
      { gräns: 10, färg: "#ffaaa5", etikett: "Mycket hög" },
      { gräns: 11, färg: "#ff8b94", etikett: "Extrem" }
    ];

    uvZoner.forEach((zon, i) => {
      const yStart = i === 0 ? y(0) : y(uvZoner[i - 1].gräns);
      const yEnd = y(zon.gräns);
      g.append("rect")
        .attr("x", 0)
        .attr("y", yEnd)
        .attr("width", width)
        .attr("height", yStart - yEnd)
        .attr("fill", zon.färg)
        .attr("opacity", 0.25);
    });

    const line = d3.line().x(d => x(d.Tid)).y(d => y(d.UV));
    g.append("path").datum(filtered).attr("fill", "none")
      .attr("stroke", "gold").attr("stroke-width", 2).attr("d", line);
d3.select("#legend-uv").html(
  uvZoner.map(zon => `
    <div>
      <span style="background:${zon.färg}; width:14px; height:14px; display:inline-block; margin-right:6px;"></span>
      ${zon.etikett} (${zon.gräns})
    </div>
  `).join("")
);
