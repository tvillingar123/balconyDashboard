const zones = [
  { min: 0, max: 2, color: "#A8E6CF", label: "Low" },
  { min: 3, max: 5, color: "#FFD3B6", label: "Moderate" },
  { min: 6, max: 7, color: "#FF8C94", label: "High" },
  { min: 8, max: 10, color: "#FF6F61", label: "Very High" },
  { min: 11, max: 15, color: "#6A1B9A", label: "Extreme" }
];

zones.forEach(z => {
  gUv.append("rect")
    .attr("x", 0)
    .attr("width", uvX.range()[1])
    .attr("y", uvY(z.max))
    .attr("height", uvY(z.min) - uvY(z.max))
    .attr("fill", z.color)
    .attr("opacity", 0.3);
});
