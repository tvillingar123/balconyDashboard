// Supabase config
const SUPABASE_URL = "https://wcnoghdwlqshwpnoknar.supabase.co";
const SUPABASE_KEY = "sb_publishable_HgB8uTl-KWqX04Mbe1I5qg_OtKAmkEy"; 

// DOM elements
const teamSelect = document.getElementById("teamSelect");
const latestDiv = document.getElementById("latest");

// Load dashboard when team changes
teamSelect.addEventListener("change", () => {
  loadDashboard(teamSelect.value);
});

// Initial load
loadDashboard("All");

function loadDashboard(selectedTeam) {
  // Clear previous charts
  ["temperature", "humidity", "pressure", "soilmoisture", "uvchart", "correlation", "drying-analysis"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  const filter = selectedTeam === "All" ? "" : `&Team=eq.${selectedTeam}`;
  const url = `${SUPABASE_URL}/rest/v1/Balcony?select=*&order=created_at.asc${filter}`;

  fetch(url, {
    headers: { apikey: SUPABASE_KEY }
  })
    .then(res => res.json())
    .then(rawData => {
      const data = rawData.map(row => ({
        Time: new Date(row.created_at),
        Temperature: parseFloat(row.MTemp),
        PosTemperature: parseFloat(row.PTemp),
        Humidity: parseFloat(row.MHum),
        PosHumidity: parseFloat(row.PHum),
        Pressure: parseFloat(row.MAirp),
        PosPressure: parseFloat(row.PAirp),
        UV: parseFloat(row.PUv),
        Wind: parseFloat(row.PWind),
        Soil1: parseFloat(row.MSoil1),
        Soil2: parseFloat(row.MSoil2),
        Soil3: parseFloat(row.MSoil3)
      }));

      const filtered = data.filter(d => !Object.values(d).some(v => isNaN(v)));

      if (filtered.length === 0) {
        latestDiv.innerText = "No data available for selected team.";
        return;
      }

      const latest = filtered.at(-1);
      latestDiv.innerText = `Latest → UV: ${latest.UV}, Temp: ${latest.Temperature}°C, Humidity: ${latest.Humidity}%`;

      const colors = {
        Temperature: "tomato",
        PosTemperature: "steelblue",
        Humidity: "skyblue",
        PosHumidity: "gray",
        Pressure: "seagreen",
        PosPressure: "goldenrod",
        Soil1: "saddlebrown",
        Soil2: "darkolivegreen",
        Soil3: "darkcyan",
        UV: "gold"
      };

      // Chart function
      function drawChart(id, localKey, posKey, legendId) {
        const svg = d3.select("#" + id).append("svg");
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };
        const width = svg.node().clientWidth - margin.left - margin.right;
        const height = 250 - margin.top - margin.bottom;
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime().domain(d3.extent(filtered, d => d.Time)).range([0, width]);
        const y = d3.scaleLinear().domain([
          d3.min(filtered, d => Math.min(d[localKey], d[posKey])) * 0.95,
          d3.max(filtered, d => Math.max(d[localKey], d[posKey])) * 1.05
        ]).range([height, 0]);

        g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
        g.append("g").call(d3.axisLeft(y));

        const line = key => d3.line().x(d => x(d.Time)).y(d => y(d[key]));

        g.append("path").datum(filtered).attr("fill", "none")
          .attr("stroke", colors[localKey]).attr("stroke-width", 2).attr("d", line(localKey));

        g.append("path").datum(filtered).attr("fill", "none")
          .attr("stroke", colors[posKey]).attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,4").attr("d", line(posKey));

        d3.select("#" + legendId).html(`
          <div><span style="background:${colors[localKey]}"></span> Local</div>
          <div><span style="background:${colors[posKey]}; border:1px dashed #333"></span> POS</div>
        `);
      }

      drawChart("temperature", "Temperature", "PosTemperature", "legend-temperature");
      drawChart("humidity", "Humidity", "PosHumidity", "legend-humidity");
      drawChart("pressure", "Pressure", "PosPressure", "legend-pressure");

      // Soil moisture chart
      const soilSvg = d3.select("#soilmoisture").append("svg");
      const margin = { top: 20, right: 20, bottom: 40, left: 50 };
      const width = soilSvg.node().clientWidth - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;
      const g = soilSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleTime().domain(d3.extent(filtered, d => d.Time)).range([0, width]);
      const y = d3.scaleLinear().domain([
        d3.min(filtered, d => Math.min(d.Soil1, d.Soil2, d.Soil3)) * 0.95,
        d3.max(filtered, d => Math.max(d.Soil1, d.Soil2, d.Soil3)) * 1.05
      ]).range([height, 0]);

      g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y));

      ["Soil1", "Soil2", "Soil3"].forEach(key => {
        const line = d3.line().x(d => x(d.Time)).y(d => y(d[key]));
        g.append("path").datum(filtered).attr("fill", "none")
          .attr("stroke", colors[key]).attr("stroke-width", 2).attr("d", line);
      });

      d3.select("#legend-soilmoisture").html(`
        <div><span style="background:${colors.Soil1}"></span> Box 1</div>
        <div><span style="background:${colors.Soil2}"></span> Box 2</div>
        <div><span style="background:${colors.Soil3}"></span> Box 3</div>
      `);

      // UV chart
      const uvSvg = d3.select("#uvchart").append("svg");
      const gUv = uvSvg.append("g").attr("transform", `translate(50,20)`);
      const uvX = d3.scaleTime().domain(d3.extent(filtered, d => d.Time)).range([0, uvSvg.node().clientWidth - 70]);
      const uvY = d3.scaleLinear().domain([0, 12]).range([230, 0]);

      gUv.append("g").attr("transform", `translate(0,230)`).call(d3.axisBottom(uvX));
      gUv.append("g").call(d3.axisLeft(uvY));

      const uvLine = d3.line().x(d => uvX(d.Time)).y(d => uvY(d.UV));
      gUv.append("path").datum(filtered).attr("fill", "none")
        .attr("stroke", colors.UV).attr("stroke-width", 2).attr("d", uvLine);

      d3.select("#legend-uv").html(`<div><span style="background:${colors.UV}"></span> UV Index</div>`);

      // Correlation analysis
function correlation(x, y) {
  const meanX = d3.mean(x);
  const meanY = d3.mean(y);
  const numerator = d3.sum(x.map((val, i) => (val - meanX) * (y[i] - meanY)));
  const denominator = Math.sqrt(
    d3.sum(x.map(val => (val - meanX) ** 2)) *
    d3.sum(y.map(val => (val - meanY) ** 2))
  );
  return numerator / denominator;
}

const avgSoil = filtered.map(d => (d.Soil1 + d.Soil2 + d.Soil3) / 3);

const factors = [
  { key: "UV", label: "UV Index", color: "gold" },
  { key: "Wind", label: "Wind Speed", color: "skyblue" },
  { key: "Temperature", label: "Temperature", color: "tomato" },
  { key: "Humidity", label: "Humidity", color: "deepskyblue" },
  { key: "Pressure", label: "Air Pressure", color: "seagreen" }
];

const correlationDiv = d3.select("#correlation");
factors.forEach(f => {
  const factorValues = filtered.map(d => d[f.key]);
  const value = correlation(avgSoil, factorValues);

  const row = correlationDiv.append("div").style("margin", "6px 0");
  row.append("span").text(`${f.label}: `).style("margin-right", "6px");

  const bar = row.append("div")
    .style("display", "inline-block")
    .style("width", "300px")
    .style("height", "12px")
    .style("background", "#eee")
    .style("vertical-align", "middle");

  bar.append("div")
    .style("width", `${Math.abs(value) * 100 / 2}%`)
    .style("height", "12px")
    .style("background", value > 0 ? f.color : "crimson")
    .style("float", value >= 0 ? "left" : "right");

  row.append("span").text(value.toFixed(2)).style("margin-left", "8px");
});

// Drying interval analysis
const intervals = { "08–14": [], "14–20": [], "20–08": [] };
filtered.forEach(d => {
  const hour = d.Time.getHours();
  if (hour >= 8 && hour < 14) intervals["08–14"].push(d);
  else if (hour >= 14 && hour < 20) intervals["14–20"].push(d);
  else intervals["20–08"].push(d);
});

const table = d3.select("#drying-analysis").append("table");
const columns = ["Interval", "ΔSoil1 (%)", "ΔSoil2 (%)", "ΔSoil3 (%)", "UV", "Wind", "Temp", "Humidity", "Pressure"];

table.append("thead").append("tr")
  .selectAll("th").data(columns).enter().append("th").text(d => d);

const rows = table.append("tbody")
  .selectAll("tr").data(Object.entries(intervals)).enter().append("tr");

rows.selectAll("td")
  .data(([label, group]) => {
    if (group.length < 2) return columns.map(() => "–");

    const soil1 = group.map(d => d.Soil1);
    const soil2 = group.map(d => d.Soil2);
    const soil3 = group.map(d => d.Soil3);

    const Δ1 = (soil1.at(-1) - soil1[0]).toFixed(1);
    const Δ2 = (soil2.at(-1) - soil2[0]).toFixed(1);
    const Δ3 = (soil3.at(-1) - soil3[0]).toFixed(1);

    const UV = d3.mean(group, d => d.UV)?.toFixed(1);
    const Wind = d3.mean(group, d => d.Wind)?.toFixed(1);
    const Temp = d3.mean(group, d => d.Temperature)?.toFixed(1);
    const Humidity = d3.mean(group, d => d.Humidity)?.toFixed(1);
    const Pressure = d3.mean(group, d => d.Pressure)?.toFixed(1);

    return [label, Δ1, Δ2, Δ3, UV, Wind, Temp, Humidity, Pressure];
  })
  .enter().append("td").text(d => d);

      
