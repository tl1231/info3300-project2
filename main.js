//Error: <g> attribute transform: Unexpected end of attribute. Expected ')', "translate(60,10".


//----------Part 1: drawing the inital view on the page
// setting up filter options and selections
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

let hour_start = 0;
let hour_end = 23;
let month_start = 1;
let month_end = 12;

const mapSvg = d3.select("#citibike_map");
const width = mapSvg.attr("width");
const height = mapSvg.attr("height");
const margin = { top: 20, right: 20, bottom: 20, left: 20 };

// Main function that contains the data within it
const renderMap = async function() {

    // Load all datasets
    const [neighborhoods, bikeDataNTA, subways, bikeDataBoro] = await Promise.all([
        d3.json("data/2020 Neighborhood Tabulation Areas (NTAs).geojson"), 
        d3.json("data/counts_by_ntaname.json"),
        d3.json("data/Subway_Lines.geojson"),
        d3.json("data/counts_by_boro.json")
    ]);

    // Store data globally
    neighborhoodFeatures = neighborhoods;
    subwayFeature = subways;
    citiBikeData = bikeDataNTA;

    // Initial setup:
    let ridesByNeighborhood = parseRidershipNH(bikeDataNTA);
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
                          .domain([0, d3.max(Object.values(ridesByNeighborhood))]);
    currentColorScale = colorScale;

    // Map Setup
    const projection = d3.geoMercator()
                        .fitSize([width - margin.left - margin.right, 
                                    height - margin.top - margin.bottom], 
                                    neighborhoods);
    const path = d3.geoPath().projection(projection);

    const neighborhoodLayer = mapSvg.append("g")
        .attr("class", "neighborhood-layer")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const subwayLayer = mapSvg.append("g")
        .attr("class", "subway-layer")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tthe neighborhood Paths
    neighborhoodLayer.selectAll("path")
        .data(neighborhoods.features)
        .join("path")
        .attr("class", "neighborhood")
        .attr("d", path)
        .attr("fill", d => {
            const rides = ridesByNeighborhood[d.properties.ntaname] || 0; //totalRidesByNeighborhood
            return colorScale(rides);
        })
        .attr("stroke", "white")
        .attr("stroke-width", "0.5px")
        .append("title")
        .text(d => {
            const rides = ridesByNeighborhood[d.properties.ntaname] || 0;
            return `${d.properties.ntaname}\nTotal Rides: ${rides.toLocaleString()}`; //totalRidesByNeighborhood
        });

    subwayLayer.selectAll("path")
        .data(subways.features)
        .join("path")
        .attr("class", "subway")
        .attr("d", path)
        .attr("fill", 'none')
        .attr("stroke", "black")
        .attr("stroke-width", "0.3px");
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

    // CREATE BAR CHART
    const barChart = d3.select("svg#bar-chart");
    const barMargin = { top: 10, right: 30, bottom: 90, left: 70 }; // adjust
    const barWidth = barChart.attr("width");
    const barHeight = barChart.attr("height");
    const barChartWidth = barWidth - barMargin.left - barMargin.right;
    const barChartHeight = barHeight - barMargin.top - barMargin.bottom;

    let annotations = barChart.append("g").attr("id", "annotations1");
    let chartArea = barChart.append("g")
                            .attr("id", "points")
                            .attr(
                                "transform",
                                `translate(${barMargin.left},${barMargin.top})`
                            );

    // Axes placeholders
    annotations.append("g")
                .attr("class", "x axis")
                .attr(
                    "transform", 
                    `translate(${barMargin.left}, ${barChartHeight + barMargin.top + 10})`
                )
                // .call(bottomAxis);

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

    // Rotate x-axis text for readability
    barChart.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.6em")
            .attr("dy", ".16em")
            .attr("transform", "rotate(-25)");

    function drawBar() {
        // Get ridership by borough
        let ridershipByBoro = parseRidershipBoro(bikeDataBoro);

        const boroughRideCounts = Object.entries(ridershipByBoro).map(([borough, count]) => ({
            borough: borough,
            count: count
        }));

        // --Scaling--
        // x-axis scale
        var boroScale = d3.scaleBand()
            .domain(boroughRideCounts.map(d => d.borough)) 
            .range([0, barChartWidth])
            .padding([0.2]);

        // y-axis scale for ride counts
        const countExtent = d3.extent(boroughRideCounts, d => d.count);
        var countScale = d3.scaleLinear()
            .domain([0, countExtent[1]])
            .range([barChartHeight, 0]); 

        // color scale for boroughs
        const barColorScale = d3.scaleOrdinal()
                .domain(boroughRideCounts.map(d => d.borough))
                .range(["#FF5733", "#33FF57", "#3357FF", "#FF33A1"])

        // --Render axes--
        // Bottom axis
        let bottomAxis = d3.axisBottom(boroScale);
        annotations.select(".x.axis").call(bottomAxis);

        // Left axis
        leftAxis.scale(countScale);
        leftAxisG.transition().call(leftAxis);

        // Gridlines
        leftGridlines.scale(countScale);
        annotations.selectAll(".y.gridlines")
                   .data([0])
                   .join("g")
                   .attr("class", "y gridlines")
                   .attr(
                        "transform",
                        `translate(${barMargin.left - 10 },${barMargin.top}`
                   )
                   .call(leftGridlines);
        // leftGridlinesG.transition().call(leftGridlines);

        // Drawing the bars
        chartArea.selectAll("rect.bar")
                 .data(boroughRideCounts)
                 .join("rect")
                 .attr("class", "bar")
                 .attr("x", d => boroScale(d.borough))
                 .attr("y", d => countScale(d.count))
                 .attr("height", d => barChartHeight - countScale(d.count))
                 .attr("width", boroScale.bandwidth())  
                 .attr("fill", d => barColorScale(d.borough))  
    }

    drawBar();
};




//--FILTER CREATION--
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
            .attr("clicked", "false")  // Change to string
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
                .attr("clicked", 'false')
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
                .attr("clicked", 'false')
                .text(type)
                .on("click", function() { filterClick(this, 'bike'); });
        });

    // Create subway overlay toggle
        overlayControls
            .append("button")
            .attr("id", "subway-toggle")
            .attr("clicked", 'false')
            .text("Hide Subway Routes") //this should be the starting state
            .on("click", toggleSubwayOverlay);
    
};

drawFilters();

//--TIME SLIDER CREATION--
function drawSliders(){
    // Time variables
    let hour_start = 0;
    let hour_end = 23;
    let month_start = 1;
    let month_end = 12;

    // Time slider setup with adjusted dimensions
    const control = d3.select("#control");
    const controlWidth = 600;
    const controlHeight = 100;  // Increased to accommodate two sliders
    const margin = {
        top: 5,
        right: 30,
        bottom: 50,
        left: 30
    };

    const controlSvg = control.append("svg")
        .attr("width", controlWidth)
        .attr("height", controlHeight + margin.bottom);

    // Create scales for the month slider
    const monthScale = d3.scaleLinear()
        .domain([1, 12])
        .range([margin.left, controlWidth - margin.right]);

    // Create scale for the hour slider
    const hourScale = d3.scaleLinear()
        .domain([0, 23])
        .range([margin.left, controlWidth - margin.right]);

    // Create the month brush
    const monthBrush = d3.brushX()
        .extent([[margin.left, margin.top], [controlWidth - margin.right, 30]])
        .on("brush", brushedMonth)
        .on("end", brushendedMonth);

    // Create the hour brush
    const hourBrush = d3.brushX()
        .extent([[margin.left, 55], [controlWidth - margin.right, 80]])
        .on("brush", brushedHour)
        .on("end", brushendedHour);

    // Add brushes to SVG
    controlSvg.append("g")
        .attr("class", "month-brush")
        .call(monthBrush);

    controlSvg.append("g")
        .attr("class", "hour-brush")
        .call(hourBrush);

    // Add axes
    const monthAxis = d3.axisBottom(monthScale)
        .tickFormat(d => {
            return d3.timeFormat("%B")(new Date(2023, d-1));
        })
        .ticks(12);

    const hourAxis = d3.axisBottom(hourScale)
        .tickFormat(d => d + ":00")
        .ticks(24);

    controlSvg.append("g")
        .attr("transform", `translate(0, 30)`)
        .call(monthAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    controlSvg.append("g")
        .attr("transform", `translate(0, 80)`)
        .call(hourAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Labels
    controlSvg.append("text")
        .attr("x", margin.left)
        .attr("y", 15)
        .text("Month Range")
        .style("font-size", "12px");

    controlSvg.append("text")
        .attr("x", margin.left)
        .attr("y", 45)
        .text("Hour Range")
        .style("font-size", "12px");

    // Brush event handlers
    function brushedMonth(event) {
        if (event.selection) {
            const [x0, x1] = event.selection;
            month_start = Math.round(monthScale.invert(x0));
            month_end = Math.round(monthScale.invert(x1));
            updateMap(hour_start, hour_end, month_start, month_end, filteredBorough, filteredRiderType);
        }
    }
    
    function brushedHour(event) {
        if (event.selection) {
            const [x0, x1] = event.selection;
            hour_start = Math.round(hourScale.invert(x0));
            hour_end = Math.round(hourScale.invert(x1));
            updateMap(hour_start, hour_end, month_start, month_end, filteredBorough, filteredRiderType);
        }
    }

    function brushendedMonth(event) {
        if (!event.selection) {
            month_start = 1;
            month_end = 12;
            updateMap(hour_start, hour_end, month_start, month_end, filteredRiderType, filteredBikeType);
        }
    }

    function brushendedHour(event) {
        if (!event.selection) {
            hour_start = 0;
            hour_end = 23;
            updateMap(hour_start, hour_end, month_start, month_end, filteredRiderType, filteredBikeType);
        }
    }
}

// Update the initialization
drawSliders();

//


// -------------Part 3: User Interaction-----------
//filter clicked
function filterClick(button, filterType) {
    let fil = d3.select(button);
    let isClicked = fil.attr("clicked") === "true";
    
    if (filterType === 'borough') {
        if (isClicked) {
            filteredBorough = filteredBorough.filter(b => b !== fil.attr("name"));
        } else {
            filteredBorough.push(fil.attr("name"));
        }
    } else if (filterType === 'rider') {
        if (isClicked) {
            filteredRiderType = filteredRiderType.filter(t => t !== fil.attr("name"));
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
    let isVisible = button.attr("clicked") === "true";
    
    button.attr("clicked", !isVisible ? "true" : "false")
          .style("background-color", !isVisible ? "#ffc63d" : "white")
          .text(!isVisible ? "Hide Subway Routes" : "Show Subway Routes");
    
    if (!isVisible) {
        showSubwayLines();
    } else {
        hideSubwayLines();
    }
}



// Update the updateFiltered function to handle hour-level filtering
function updateFiltered() {
    // Update the map with current filters and time range
    updateMap(time_start, time_end, filteredBorough, filteredRiderType);
    // ... rest of your updateFiltered code ...
}

// Clear all filters
function clear() {
    // Reset time variables
    hour_start = 0;
    hour_end = 23;
    month_start = 1;
    month_end = 12;
    
    // Reset subway visibility
    showSubwayLines();
    
    // Reset filters
    filteredBorough = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
    filteredRiderType = ["Member", "Casual"];
    
    // Reset button styles
    d3.selectAll(".borough-filter, .rider-filter")
        .style("background-color", "white")
        .attr("clicked", "false");
    
    // Reset subway toggle
    d3.select("#subway-toggle")
        .attr("clicked", "false")
        .style("background-color", "white")
        .text("Show Subway Routes");
    
    // Update the map
    updateMap(hour_start, hour_end, month_start, month_end, filteredBorough, filteredRiderType);
    
    // Reset both brushes
    d3.select(".month-brush").call(monthBrush.move, null);
    d3.select(".hour-brush").call(hourBrush.move, null);
}

// Functions to show/hide subway lines
function showSubwayLines() {
    d3.select(".subway-layer").style("visibility", "visible");
}

function hideSubwayLines() {
    d3.select(".subway-layer").style("visibility", "hidden");
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
// let neighborhoodFeatures = null;  // Store neighborhood data globally
// let citiBikeData = null;         // Store bike data globally



// Initialize everything
renderMap().then(() => {
    console.log("Map initialized");
});

// Modify the updateMap function
function updateMap(hourStart, hourEnd, monthStart, monthEnd, boroughFilter, riderFilter) {
    // Check if data is loaded
    if (!neighborhoodFeatures || !citiBikeData) {
        console.log("Data not yet loaded");
        return;
    }

    console.log("Updating map with:", {
        hourStart, hourEnd, monthStart, monthEnd,
        boroughFilter, riderFilter
    });

    const mapSvg = d3.select("#citibike_map");
    
    // Calculate filtered rides for each neighborhood using parseRidershipNH
    let filteredRidesByNeighborhood = parseRidershipNH(
        citiBikeData,
        hourStart,  // start hour
        hourEnd,    // end hour
        monthStart, // start month
        monthEnd,   // end month
        riderFilter === "Member" ? "m" : riderFilter === "Casual" ? "c" : "all"  // convert rider type to match data format
    );
    
    // Update color scale with new data
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(Object.values(filteredRidesByNeighborhood)) || 1]);
    
    // Update neighborhood paths
    const neighborhoods = mapSvg.select(".neighborhood-layer")
        .selectAll("path.neighborhood")
        .data(neighborhoodFeatures.features);

    neighborhoods
        .transition()
        .duration(200)
        .attr("fill", d => {
            const rides = filteredRidesByNeighborhood[d.properties.ntaname] || 0;
            return colorScale(rides);
        });

    // Update tooltips
    neighborhoods.select("title")
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



// Toggle button state
    fil.attr("clicked", !isClicked ? "true" : "false")
        .style("background-color", !isClicked ? "#ffc63d" : "white");
    // Update the map with new filters
    updateMap(time_start, time_end, filteredBorough, filteredRiderType);
}


