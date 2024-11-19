
// --------setting up filter options and selections-------------
const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
const riderTypes = ["Member", "Casual"];
const bikeTypes = ["Regular", "E-Bike"];

// State variables
let filteredBorough = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
let filteredRiderType = ["Member", "Casual"];
let filteredBikeType = ["Regular, E-Bike"];
let showSubwayOverlay = true;
let time_start = new Date(2013, 0, 1);
let time_end = new Date(2023, 11, 31);
const min_date = new Date(2013, 0, 1);
const max_date = new Date(2023, 11, 31);

function drawFilters (){
    // Create filter sections
    let boroughFilters = d3.select("#borough-filters");
    let riderFilters = d3.select("#rider-filters");
    let bikeFilters = d3.select("#bike-filters");
    let overlayControls = d3.select("#overlay-controls");

    // Add clear button
    clearArea = d3.select("#clearArea")
    let clearButton = clearArea
    .append("button")
    .attr("id", "clear")
    .text("Reset Visualizations")
    .on("click", clear);

    // Create borough filter buttons
    boroughs.forEach((borough) => {
        boroughFilters
            .append("button")
            .attr("name", borough)
            .attr("id", borough)
            .attr("class", "borough-filter")
            .attr("clicked", false)
            .text(borough)
            .on("click", function() { filterClick(this, 'borough'); });
    });


    // Create rider type filter buttons
        riderTypes.forEach((type) => {
            riderFilters
                .append("button")
                .attr("name", type)
                .attr("id", type)
                .attr("class", "rider-filter")
                .attr("clicked", false)
                .text(type)
                .on("click", function() { filterClick(this, 'rider'); });
        });

    // Create bike type filter buttons
        bikeTypes.forEach((type) => {
            bikeFilters
                .append("button")
                .attr("name", type)
                .attr("id", type)
                .attr("class", "bike-filter")
                .attr("clicked", false)
                .text(type)
                .on("click", function() { filterClick(this, 'bike'); });
        });

    // Create subway overlay toggle
        overlayControls
            .append("button")
            .attr("id", "subway-toggle")
            .attr("clicked", false)
            .text("Hide Subway Routes") //this should be the starting state
            .on("click", toggleSubwayOverlay);
    
};

drawFilters();


// -------------------handling a controller being clicked-----------
//filter clicked
function filterClick(button, filterType) {
    let fil = d3.select(button);
    
    if (filterType === 'borough') {
        if (fil.attr("clicked") == "true") {
            filteredBorough = filteredBorough.filter(b => b !== fil.attr("name"));
            fil.style("background-color", "white");
            fil.attr("clicked", false);
        } else {
            filteredBorough.push(fil.attr("name"));
            fil.attr("clicked", true);
            fil.style("background-color", "#ffc63d");
        }
    } else if (filterType === 'rider') {
        if (fil.attr("clicked") == "true") {
            filteredRiderType = filteredRiderType.filter(t => t !== fil.attr("name"));
            fil.style("background-color", "white");
            fil.attr("clicked", false);
        } else {
            filteredRiderType.push(fil.attr("name"));
            fil.attr("clicked", true);
            fil.style("background-color", "#ffc63d");
        }
    } else {
        // if (fil.attr("clicked") == "true") {
        //     filteredRiderType = filteredRiderType.filter(t => t !== fil.attr("name"));
        //     fil.style("background-color", "white");
        //     fil.attr("clicked", false);
        // } else {
        //     filteredRiderType.push(fil.attr("name"));
        //     fil.attr("clicked", true);
        //     fil.style("background-color", "#ffc63d");
        // }
        console.log("changed bike type")
    }  
    
    // Update the map with current filters and time range
    updateMap(time_start, time_end, filteredBorough, filteredRiderType);
}
// Subway overlay toggle handler
function toggleSubwayOverlay() {
    let button = d3.select("#subway-toggle");
    console.log(button)
    showSubwayOverlay = !showSubwayOverlay;
    
    if (showSubwayOverlay) {
        button.style("background-color", "#ffc63d")
        .text("Hide Subway Routes");
        showSubwayLines();
    } else {
        button.style("background-color", "white")
        .text("Show Subway Routes");
        hideSubwayLines();
    }
}

// Create the time slider immediately after the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Time variables
    let time_start = new Date(2013, 0, 1);
    let time_end = new Date(2023, 11, 31);
    let min_date = new Date(2013, 0, 1);
    let max_date = new Date(2023, 11, 31);

    // Time slider setup with adjusted dimensions
    const control = d3.select("#control");
    const controlWidth = 600;
    const controlHeight = 40;  // Reduced from 80
    const margin = {
        top: 5,     // Reduced from 10
        right: 30, 
        bottom: 50, 
        left: 30
    };

    const controlSvg = control.append("svg")
        .attr("width", controlWidth)
        .attr("height", controlHeight + margin.bottom);  // Total height is now 90px (40 + 50)

    // Create scales for the time slider
    const timeScale = d3.scaleTime()
        .domain([min_date, max_date])
        .range([margin.left, controlWidth - margin.right]);

    // Create the brush with shorter height
    const myBrush = d3.brushX()
        .extent([[margin.left, margin.top], [controlWidth - margin.right, controlHeight - margin.top]])
        .on("brush", brushed)
        .on("end", brushended);

    // Add brush to SVG
    controlSvg.append("g")
        .attr("class", "brush")
        .call(myBrush);

    // Add axis with year and month formatting
    const timeAxis = d3.axisBottom(timeScale)
        .tickFormat(d3.timeFormat("%Y %b"))
        .ticks(d3.timeMonth.every(6));

    controlSvg.append("g")
        .attr("transform", `translate(0, ${controlHeight})`)
        .call(timeAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Brush event handlers
    function brushed(event) {
        if (event.selection) {
            // Get the selected time range
            time_start = timeScale.invert(event.selection[0]);
            time_end = timeScale.invert(event.selection[1]);
            
            // Update the map with new time range
            updateMap(time_start, time_end, filteredBorough, filteredRiderType);
        }
    }

    function brushended(event) {
        if (!event.selection) {
            time_start = min_date;
            time_end = max_date;
            console.log("Reset time range"); // For debugging
        }
    }
});

// Update the updateFiltered function to handle hour-level filtering
function updateFiltered() {
    // Update the map with current filters and time range
    updateMap(time_start, time_end, filteredBorough, filteredRiderType);
    // ... rest of your updateFiltered code ...
}

// Clear all filters
function clear() {
    // Reset time variables
    time_start = min_date;
    time_end = max_date;
    
    console.log()
    showSubwayLines();
    
    // Reset filters
    filteredBorough = [];
    filteredRiderType = [];
    
    // Reset button styles
    d3.selectAll(".borough-filter")
        .style("background-color", "white")
        .attr("clicked", false);
    
    d3.selectAll(".rider-filter")
        .style("background-color", "white")
        .attr("clicked", false);
    
    // Update the map
    updateMap(time_start, time_end, filteredBorough, filteredRiderType);
    
    // Reset brush if it exists
    if (typeof myBrush !== 'undefined') {
        d3.select("g.brush").call(myBrush.move, null);
    }
}

// Functions to show/hide subway lines
function showSubwayLines() {
// Add your subway visualization code here
// For example:
    d3.selectAll(".subway")
        .attr("visibility", "visible");
}

function hideSubwayLines() {
// Add your subway hide code here
d3.selectAll(".subway")
    .attr("visibility", "hidden");
}

// Update visualization based on filtered data
function updateVisualization(filteredData) {
// Update your main visualization here
// This function should handle updating all visual elements
// based on the current filtered dataset

// Update time series if it exists
if (typeof makePath === 'function') {
    makePath();
}

// Update map
updateMap(filteredData);

// Update any other visualizations
updateStatistics(filteredData);
}

// Simplified version to just show the map
let currentColorScale; // Add at top of script

// Add these global variables at the top of your script
let neighborhoodFeatures = null;  // Store neighborhood data globally
let citiBikeData = null;         // Store bike data globally

// Modify the renderMap function
const renderMap = async function() {
    const mapSvg = d3.select("#citibike_map");
    const width = mapSvg.attr("width");
    const height = mapSvg.attr("height");
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    
    try {
        // Load both datasets
        const [neighborhoods, bikeData, subways] = await Promise.all([
            d3.json("data/2020 Neighborhood Tabulation Areas (NTAs).geojson"),
            d3.json("data/counts_by_ntaname.json"),
            d3.json("data/Subway_Lines.geojson")

        ]);

        // Store data globally
        neighborhoodFeatures = neighborhoods;
        subwayFeature = subways;
        citiBikeData = bikeData;

        // Calculate total rides per neighborhood
        const totalRidesByNeighborhood = {};
        Object.entries(bikeData).forEach(([neighborhood, counts]) => {
            totalRidesByNeighborhood[neighborhood] = Object.values(counts).reduce((a, b) => a + b, 0);
        });

        // Create color scale
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(Object.values(totalRidesByNeighborhood))]);
        
        // Store color scale globally
        currentColorScale = colorScale;
        
        // Set up projection
        const projection = d3.geoMercator()
            .fitSize([width - margin.left - margin.right, 
                      height - margin.top - margin.bottom], 
                      neighborhoods);
        const path = d3.geoPath().projection(projection);

        // Draw map
        const map = mapSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        map.selectAll("path")
            .data(neighborhoods.features)
            .join("path")
            .attr("d", path)
            .attr("fill", d => {
                const rides = totalRidesByNeighborhood[d.properties.ntaname] || 0;
                return colorScale(rides);
            })
            .attr("stroke", "white")
            .attr("stroke-width", "0.5px")
            .append("title")
            .text(d => {
                const rides = totalRidesByNeighborhood[d.properties.ntaname] || 0;
                return `${d.properties.ntaname}\nTotal Rides: ${rides.toLocaleString()}`;
            });
        const map_subway = mapSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .attr("class", "map_subway");

        map_subway.selectAll("path.subway")
            .data(subways.features)
            .join("path")
            .attr("class", "subway")
            .attr("d", path)
            .attr("fill", 'none')
            .attr("stroke", "black")
            .attr("stroke-width", "0.3px")
            .append("title");

        // Add legend
        const legendWidth = 200;
        const legendHeight = 10;
        const legend = mapSvg.append("g")
            .attr("transform", `translate(${margin.left}, ${height - margin.bottom - 40})`);

        // Create gradient for legend
        const defs = mapSvg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient");

        // Add legend axis
        legend.append("g")
            .attr("class", "legend-axis");

        // Initial legend update
        updateLegend(colorScale);

    } catch (error) {
        console.error("Error loading or rendering map:", error);
    }
};

// Initialize everything
renderMap().then(() => {
    console.log("Map initialized");
});

// Modify the updateMap function
function updateMap(timeStart, timeEnd, boroughFilter, riderFilter) {
    // Check if data is loaded
    if (!neighborhoodFeatures || !citiBikeData) {
        console.log("Data not yet loaded");
        return;
    }

    const mapSvg = d3.select("#citibike_map");
    
    // Calculate filtered rides for each neighborhood
    const filteredRidesByNeighborhood = {};
    
    Object.entries(citiBikeData).forEach(([neighborhood, counts]) => {
        let totalRides = 0;
        
        Object.entries(counts).forEach(([key, value]) => {
            const [year, month, riderType, bikeType] = key.split('_');
            const date = new Date(2013 + parseInt(year), parseInt(month) - 1);
            
            if (date >= timeStart && date <= timeEnd) {
                const isRiderTypeMatch = riderFilter.length === 0 || 
                    (riderType === 'c' && riderFilter.includes('Casual')) ||
                    (riderType === 'm' && riderFilter.includes('Member'));
                
                if (isRiderTypeMatch) {
                    totalRides += value;
                }
            }
        });
        
        filteredRidesByNeighborhood[neighborhood] = totalRides;
    });
    
    // Update color scale with new data
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(Object.values(filteredRidesByNeighborhood))]);
    
    // Update map colors
    mapSvg.selectAll("path")
        .data(neighborhoodFeatures.features)  // Rebind the data
        .join("path")
        .transition()
        .duration(200)
        .attr("fill", d => {
            const rides = filteredRidesByNeighborhood[d.properties.ntaname] || 0;
            return colorScale(rides);
        });

    // Update tooltips
    mapSvg.selectAll("path")
        .select("title")
        .text(d => {
            const rides = filteredRidesByNeighborhood[d.properties.ntaname] || 0;
            return `${d.properties.ntaname}\nTotal Rides: ${rides.toLocaleString()}`;
        });
    
    // Update legend
    updateLegend(colorScale);
}

// Add this function to update the legend
function updateLegend(colorScale) {
    const mapSvg = d3.select("#citibike_map");
    const legendWidth = 200;
    
    const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format(",.0f"));
    
    mapSvg.select(".legend-axis")
        .transition()
        .duration(200)
        .call(legendAxis);
    
    // Update gradient
    const linearGradient = mapSvg.select("#legend-gradient");
    
    linearGradient.selectAll("stop")
        .data(colorScale.ticks().map((t, i, n) => ({ 
            offset: `${i*100/n.length}%`,
            color: colorScale(t) 
        })))
        .join("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);
}

// Modify your existing time slider callback
function timeSliderCallback(timeStart, timeEnd) {
    // Update the map with new time range
    updateMap(timeStart, timeEnd, filteredBorough, filteredRiderType);
    // ... your existing time slider code ...
}

// Modify your existing filter click handler
function filterClick(button, filterType) {
    // ... your existing filter code ...
    
    // Update the map with new filters
    updateMap(time_start, time_end, filteredBorough, filteredRiderType);
}

// CREATE BAR CHART
const barChart = d3.select("svg#bar");
const barMargin = { top: 10, right: 30, bottom: 90, left: 70 }; // adjust
const barWidth = barChart.attr("width");
const barHeight = barChart.attr("height");
const barChartWidth = barWidth - barMargin.left - barMargin.right;
const barChartHeight = barHeight - barMargin.top - barMargin.bottom;

let annotations = barChart.append("g").attr("id", "annotations1");
let chartArea = barChart
  .append("g")
  .attr("id", "points")
  .attr(
    "transform",
    "translate(" + barMargin.left + "," + barMargin.top + ")"
  );

let leftAxis = d3.axisLeft();
let leftGridlines = d3.axisLeft()
                    .tickSize(-barChartWidth - 10)
                    .tickFormat("");

let leftAxisG = annotations.append("g")
                        .attr("class", "y axis")
                        .attr(
                            "transform",
                            `translate(${barMargin.left - 10},${barMargin.top})`
                        );

let leftGridlinesG = annotations.append("g")
                                .attr("class", "y gridlines")
                                .attr(
                                    "transform",
                                    `translate(${barMargin.left - 10},${barMargin.top})`
                                );
