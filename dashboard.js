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

  // Gemensam diagramfunktion
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

  // Temperatur, luftfukt, lufttryck
  ritaDiagram("temperatur", "Temperatur", "PosTemperatur", "legend-temperatur");
  ritaDiagram("luftfuktighet", "Luftfuktighet", "PosLuftFuktighet", "legend-luftfuktighet");
  ritaDiagram("lufttryck", "Lufttryck", "PosLufttryck", "legend-lufttryck");

  // Jordfuktdiagram
  const jordSvg = d3.select("#jordfukt").append("svg");
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = jordSvg.node().clientWidth - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;
  const g = jordSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

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
      .attr("stroke", färger.UV).attr("stroke-width", 2).attr("d", line);

    d3.select("#legend-uv").html(
      uvZoner.map(zon => `
        <div>
          <span style="background:${zon.färg}; width:14px; height:14px; display:inline-block; margin-right:6px;"></span>
          ${zon.etikett} (${zon.gräns})
        </div>
      `).join("")
    );
  } // ← slutet på funktionen ritaUvDiagram

  // 👇 UV-grafen visas nu
  ritaUvDiagram();

  // 🔗 Korrelation med jordfukt
  function korrelation(x, y) {
    const mx = d3.mean(x), my = d3.mean(y);
    const num = d3.sum(x.map((v, i) => (v - mx) * (y[i] - my)));
    const den = Math.sqrt(
      d3.sum(x.map(v => (v - mx) ** 2)) *
      d3.sum(y.map(v => (v - my) ** 2))
    );
    return num / den;
  }

  const jordMedel = filtered.map(d => (d.Jord1 + d.Jord2 + d.Jord3) / 3);
  const faktorer = [
    { key: "UV", label: "UV-index", color: "gold" },
    { key: "Vind", label: "Vindstyrka", color: "skyblue" },
    { key: "Temperatur", label: "Temperatur", color: "tomato" },
    { key: "Luftfuktighet", label: "Luftfuktighet", color: "deepskyblue" },
    { key: "Lufttryck", label: "Lufttryck", color: "seagreen" }
  ];

  const korDiv = d3.select("#korrelation");
  faktorer.forEach(f => {
    const korval = korrelation(jordMedel, filtered.map(d => d[f.key]));
    const rad = korDiv.append("div").style("margin", "6px 0");
    rad.append("span").text(`${f.label}: `).style("margin-right", "6px");
    const bar = rad.append("div").style("display", "inline-block")
      .style("width", "300px").style("height", "12px")
      .style("background", "#eee").style("vertical-align", "middle");
    bar.append("div").style("width", `${Math.abs(korval) * 100 / 2}%`)
      .style("height", "12px")
      .style("background", korval > 0 ? f.color : "crimson")
      .style("float", korval >= 0 ? "left" : "right");
    rad.append("span").text(korval.toFixed(2)).style("margin-left", "8px");
  });

  // 🕓 Torkintervallanalys
  const grupper = { "08–14": [], "14–20": [], "20–08": [] };
  filtered.forEach(d => {
    const h = d.Tid.getHours();
    if (h >= 8 && h < 14) grupper["08–14"].push(d);
    else if (h >= 14 && h < 20) grupper["14–20"].push(d);
    else grupper["20–08"].push(d);
  });

  const tabell = d3.select("#torkanalys").append("table");
  const kolumner = ["Intervall", "ΔJord1 (%)", "ΔJord2 (%)", "ΔJord3 (%)", "UV", "Vind", "Temp", "Luftfukt", "Tryck"];

  tabell.append("thead").append("tr")
    .selectAll("th").data(kolumner).enter().append("th").text(d => d);

  const rows = tabell.append("tbody")
    .selectAll("tr").data(Object.entries(grupper)).enter().append("tr");

  rows.selectAll("td")
    .data(([label, grupp]) => {
      if (grupp.length < 2) return kolumner.map(() => "–");
      const jord1 = grupp.map(d => d.Jord1);
      const jord2 = grupp.map(d => d.Jord2);
      const jord3 = grupp.map(d => d.Jord3);
      const Δ1 = (jord1.at(-1) - jord1[0]).toFixed(1);
      const Δ2 = (jord2.at(-1) - jord2[0]).toFixed(1);
      const Δ3 = (jord3.at(-1) - jord3[0]).toFixed(1);
      const UV = d3.mean(grupp, d => d.UV)?.toFixed(1);
      const Vind = d3.mean(grupp, d => d.Vind)?.toFixed(1);
      const Temp = d3.mean(grupp, d => d.Temperatur)?.toFixed(1);
      const Luft = d3.mean(grupp, d => d.Luftfuktighet)?.toFixed(1);
      const Tryck = d3.mean(grupp, d => d.Lufttryck)?.toFixed(1);
      return [label, Δ1, Δ2, Δ3, UV, Vind, Temp, Luft, Tryck];
    })
    .enter().append("td").text(d => d);

}); // ← Avslutar .then(data => { ... })

