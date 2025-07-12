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

// Tooltip container
const tooltip = d3.select("body").append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("border", "1px solid #ccc")
  .style("padding", "8px")
  .style("pointer-events", "none")
  .style("font-size", "0.9rem")
  .style("border-radius", "4px")
  .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
  .style("display", "none");

function loadDashboard(selectedTeam) {
  [
    "temperature", "legend-temperature",
    "uvchart", "legend-uv"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  const filter = selectedTeam === "All" ? "" : `&Team=eq.${selectedTeam}`;
  const url = `${SUPABASE_URL}/rest/v1/BalconyData?select=*&order=created_at.asc${filter}`;

  fetch(url, { headers: { apikey: SUPABASE_KEY } })
    .then(async res => {
      const rawData = await res.json();

      if (!res.ok || !Array.isArray(rawData)) {
        const message = rawData.message || rawData.error || "Unexpected response.";
        latestDiv.innerText = `Error: ${message}`;
        console.error("Supabase error:", rawData);
        return;
      }

      const data = rawData.map(row => ({
        Time: new Date(row.created_at),
        Temperature: parseFloat(row.MTemp),
        PosTemperature: parseFloat(row.PTemp),
        UV: parseFloat(row.PUv)
      }));

      const filtered = data.filter(d => !Object.values(d).some(v => isNaN(v)));
      if (filtered.length === 0) {
        latestDiv.innerText = "No valid data found.";
        return;
      }

      const latest = filtered.at(-1);
      latestDiv.innerText = `Latest → UV: ${latest.UV}, Temp: ${latest.Temperature}°C`;

      const colors = {
        Temperature: "tomato",
        PosTemperature: "steelblue",
        UV: "gold"
      };

      drawChart("temperature", "Temperature", "PosTemperature", "legend-temperature", filtered, colors);
      drawUVChart("uvchart", "UV", "legend-uv", filtered, colors);
    })
    .catch(err => {
      latestDiv.innerText = "Failed to load data from Supabase.";
      console.error("Fetch error:", err);
    });
}

function drawChart(id, keyA, keyB, legendId, data, colors) {
  const svg = d3.select("#" + id).append("svg");
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = svg.node().clientWidth - margin.left - margin.right;
  const height = 250;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().domain(d3.extent(data, d => d.Time)).range([0, width]);
  const y = d3.scaleLinear().domain([
    d3.min(data, d => Math.min(d[keyA], d[keyB])) * 0.95,
    d3.max(data, d => Math.max(d[keyA], d[keyB])) * 1.05
  ]).range([height - margin.bottom, 0]);

  g.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%d %b %H:%M")));
  g.append("g").call(d3.axisLeft(y));

  const line = key => d3.line().x(d => x(d.Time)).y(d => y(d[key]));

  g.append("path").datum(data).attr("fill", "none")
    .attr("stroke", colors[keyA]).attr("stroke-width", 2).attr("d", line(keyA));

  g.append("path").datum(data).attr("fill", "none")
    .attr("stroke", colors[keyB]).attr("stroke-width", 2)
    .attr("stroke-dasharray", "4,4").attr("d", line(keyB));

  // Add points with tooltip
  [keyA, keyB].forEach(key => {
    g.selectAll("circle." + key)
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.Time))
      .attr("cy", d => y(d[key]))
      .attr("r", 4)
      .attr("fill", colors[key])
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
          .html(`<strong>${key}</strong><br>${d[key]}°C<br>${d.Time.toLocaleString()}`);
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("display", "none");
      });
  });

  // Legend
  d3.select("#" + legendId).html(`
    <div><span style="background:${colors[keyA]};width:12px;height:12px;display:inline-block;margin-right:4px"></span> Local</div>
    <div><span style="background:${colors[keyB]};width:12px;height:12px;display:inline-block;margin-right:4px;border:1px dashed #333"></span> POS</div>
  `);
}

function drawUVChart(id, key, legendId, data, colors) {
  const svg = d3.select("#" + id).append("svg");
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = svg.node().clientWidth - margin.left - margin.right;
  const height = 250;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().domain(d3.extent(data, d => d.Time)).range([0, width]);
  const y = d3.scaleLinear().domain([0, 15]).range([height - margin.bottom, 0]);

  // WHO UV shading
  const zones = [
    { min: 0, max: 2, color: "#A8E6CF", label: "Low" },
    { min: 3, max: 5, color: "#FFD3B6", label: "Moderate" },
    { min: 6, max: 7, color: "#FF8C94", label: "High" },
    { min: 8, max: 10, color: "#FF6F61", label: "Very High" },
    { min: 11, max: 15, color: "#6A1B9A", label: "Extreme" }
  ];

  zones.forEach(z => {
    g.append("rect")
      .attr("x", 0)
      .attr("width", x.range()[1])
      .attr("y", y(z.max))
      .attr("height", y(z.min) - y(z.max))
      .attr("fill", z.color)
      .attr("opacity", 0.3);
  });

  g.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%d %b %H:%M")));
  g.append("g").call(d3.axisLeft(y));

  const line = d3.line().x(d => x(d.Time)).y(d => y(d[key]));

  g.append("path").datum(data).attr("fill", "none")
    .attr("stroke", colors[key]).attr("stroke-width", 2).attr("d", line);

  d3.select("#" + legendId).html(`
    <div><span style="background:${colors[key]};width:12px;height:12px;display:inline-block;margin-right:4px"></span> UV Index</div>
  `);
}
  // Add WHO UV zone labels
  zones.forEach(z => {
    g.append("text")
      .attr("x", 6)
      .attr("y", y((z.min + z.max) / 2))
      .text(z.label)
      .style("font-size", "10px")
      .style("fill", "#333");
  });

  // Add tooltip for UV points
  g.selectAll("circle." + key)
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.Time))
    .attr("cy", d => y(d[key]))
    .attr("r", 4)
    .attr("fill", colors[key])
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(`<strong>${key}</strong><br>UV: ${d[key]}<br>${d.Time.toLocaleString()}`);
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("display", "none");
    });
}
