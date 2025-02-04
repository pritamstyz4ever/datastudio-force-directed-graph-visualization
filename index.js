/**
 * Force Directed Graph visualization for Looker Studio.
 * This code expects the data source to provide:
 *   - Dimensions:
 *       dimensions[0]: source (e.g., pipeline-job identifier)
 *       dimensions[1]: target (hostname)
 *   - Metric:
 *       metrics[0]: weight (query count)
 *
 * The visualization uses D3.js to render a force-directed network graph.
 */

// DSCC (Data Studio Community Component) object is expected to be available.
const dscc = window.dscc || {};
const dsccConstants = dscc.constants || {};

const container = d3.select('#container');
let svg;
let simulation;

// Initialize the visualization
function init() {
  // Append an SVG element to the container
  svg = container.append('svg')
    .attr('width', '100%')
    .attr('height', '600px');

  // Set up the force simulation with desired forces
  simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(window.innerWidth / 2, 300));
}

// Update the visualization with new data from Looker Studio
function update(data) {
  // Data comes in via dscc.update; here we assume it is provided in data.tables.DEFAULT.rows.
  // Each row is expected to have:
  //   dimensions[0]: source (pipeline-job identifier)
  //   dimensions[1]: target (hostname)
  //   metrics[0]: weight (query count)
  const rows = data.tables.DEFAULT.rows || [];
  
  // Build a dictionary of nodes and a list of links
  const nodesMap = {};
  const links = rows.map(row => {
    const source = row.dimensions[0].value;
    const target = row.dimensions[1].value;
    const weight = +row.metrics[0].value; // ensure numeric
    if (!nodesMap[source]) { nodesMap[source] = { id: source, group: 'pipeline-job' }; }
    if (!nodesMap[target]) { nodesMap[target] = { id: target, group: 'hostname' }; }
    return { source, target, weight };
  });
  
  const nodes = Object.values(nodesMap);

  // Clear any existing elements in the SVG
  svg.selectAll("*").remove();
  
  // Create link elements (lines)
  const link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .enter().append("line")
      .attr("stroke-width", d => Math.sqrt(d.weight));
  
  // Create node elements (circles)
  const node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
      .attr("r", 8)
      .attr("fill", d => d.group === "pipeline-job" ? "#1f77b4" : "#ff7f0e")
      .call(drag(simulation));
  
  // Add tooltips for nodes
  node.append("title")
      .text(d => d.id);
  
  // Start the simulation
  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(links);
  
  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    
    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
  }
}

// Helper function for drag behavior
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// Expose the DSCC-required methods
window.dscc = window.dscc || {};
window.dscc.init = init;
window.dscc.update = update;
