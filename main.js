
//----------Part 1: drawing the inital view on the page-------
// setting up filter options and selections
const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
const riderTypes = ["Member", "Casual"];
const bikeTypes = ["Regular", "E-Bike"];

// State variables
let filteredBorough = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
let filteredRiderType = ["m", "c"];  // Use data values directly
let filteredBikeType = ["cb", "eb"]; // Use data values directly
let showSubwayOverlay = true;

let hour_start = 0;
let hour_end = 23;
let month_start = 1;
let month_end = 12;

let monthBrush;
let hourBrush;

let bikeDataBoro;  // Declare global variable
let neighborhoodFeatures;
let subwayFeature;
let citiBikeData;


//declare global filter
var data_filter = {
    "hour_start": 0,
    "hour_end": 23,
    "month_start": 1,
    "month_end": 11,
    "ride_type": ["m", "c"],
    "bike_type": ["cb", "eb"],
    "showSubwayOverlay": true,
    "boros": ["Manhattan", "Brooklyn", "Queens", "Bronx"]
}

//create map area
const mapSvg = d3.select("#citibike_map");
const mapwidth = mapSvg.attr("width");
const mapheight = mapSvg.attr("height");
const mapmargin = { top: 20, right: 20, bottom: 20, left: 20 };

const neighborhoodLayer = mapSvg.append("g")
        .attr("class", "neighborhood-layer")
        .attr("transform", `translate(${mapmargin.left},${mapmargin.top})`);

const subwayLayer = mapSvg.append("g")
        .attr("class", "subway-layer")
        .attr("transform", `translate(${mapmargin.left},${mapmargin.top})`);


// create bar chart area
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

//--------------------------------main renderMap function containing the data----------------
// Main function that contains the data within it
const renderMap = async function() {

    // Load all datasets
    const [neighborhoods, bikeDataNTA, subways, bikeDataBoroData] = await Promise.all([
        d3.json("data/2020 Neighborhood Tabulation Areas (NTAs).geojson"), 
        d3.json("data/counts_by_ntaname.json"),
        d3.json("data/Subway_Lines.geojson"),
        d3.json("data/counts_by_boro.json")
    ]);

    // Store data globally - should remove these soon
    citiBikeData = bikeDataNTA;


    // Initially creating the map
    let ridesByNeighborhood = parseRidershipNH(bikeDataNTA, data_filter);
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
                          .domain([0, d3.max(Object.values(ridesByNeighborhood))]);
    currentColorScale = colorScale;

    // Map Setup
    const projection = d3.geoMercator()
                        .fitSize([mapwidth - mapmargin.left - mapmargin.right, 
                                    mapheight - mapmargin.top - mapmargin.bottom], 
                                    neighborhoods);
    const path = d3.geoPath().projection(projection);

    drawUpdateNeighborhoodsMap(path, neighborhoods, ridesByNeighborhood, colorScale);

    //draw out the subway lines
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
        .attr("transform", `translate(${mapmargin.left}, ${mapheight - mapmargin.bottom - 40})`);

    // Create gradient for legend
    const defs = mapSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient");

    // Add legend axis
    legend.append("g")
        .attr("class", "legend-axis");

    // Initial legend update
    // updateLegend(colorScale);

    
    drawBar();

    function filterClick(button, filterType, data_filter) {
        let fil = d3.select(button);
        
        if (filterType === 'borough') {
            console.log("boro slected :(")
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
              selection_code = name_map[fil.attr("name")];
              fil.style("background-color", "white");
              fil.attr("clicked", false);
              if (data_filter['ride_type'].includes(selection_code)) {
                data_filter['ride_type'].splice(data_filter['ride_type'].indexOf(selection_code), 1);
              }
            } else {
              selection_code = name_map[fil.attr("name")];
              fil.attr("clicked", true);
              fil.style("background-color", "#ffc63d");
              if (!data_filter['ride_type'].includes(selection_code)) {
                data_filter['ride_type'].push(selection_code);
              };
            }
        } else {
          if (fil.attr("clicked") == "true") {
            selection_code = name_map[fil.attr("name")];
            fil.style("background-color", "white");
            fil.attr("clicked", false);
            if (data_filter['bike_type'].includes(selection_code)) {
              data_filter['bike_type'].splice(data_filter['bike_type'].indexOf(selection_code), 1);
            }
          } else {
            selection_code = name_map[fil.attr("name")];
            fil.attr("clicked", true);
            fil.style("background-color", "#ffc63d");
            if (!data_filter['bike_type'].includes(selection_code)) {
              data_filter['bike_type'].push(selection_code);
            };
          }
        }  
        
        // parseRidershipNH(counts_by_ntaname, data_filter)
        // Update the map with current filters and time range
        updateMap(time_start, time_end, filteredBorough, filteredRiderType);
      }

    function drawFilters (counts_by_ntaname){
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
            .attr("clicked", true)
            .text(borough)
            .on("click", function() { filterClick(this, 'borough', counts_by_ntaname); });
    });


    // Create rider type filter buttons
        riderTypes.forEach((type) => {
            riderFilters
                .append("button")
                .attr("name", type)
                .attr("id", type)
                .attr("class", "rider-filter")
                .attr("clicked", true)
                .text(type)
                .style("background-color", "#ffc63d")
                .on("click", function() { filterClick(this, 'rider', counts_by_ntaname); });
        });

    // Create bike type filter buttons
        bikeTypes.forEach((type) => {
            bikeFilters
                .append("button")
                .attr("name", type)
                .attr("id", type)
                .attr("class", "bike-filter")
                .attr("clicked", true)
                .text(type)
                .style("background-color", "#ffc63d")
                .on("click", function() { filterClick(this, 'bike', counts_by_ntaname); });
        });

    // Create subway overlay toggle
        overlayControls
            .append("button")
            .attr("id", "subway-toggle")
            .attr("clicked", true)
            .text("Hide Subway Routes") //this should be the starting state
            .style("background-color", "#ffc63d")
            .on("click", toggleSubwayOverlay);

    };

    drawFilters();
    console.log('has drawn filters')

};



drawSliders();




// -------------Part 3: User Interaction-----------
// filter clicked
// function filterClick(button, filterType) {
//     let fil = d3.select(button);
//     let buttonName = fil.attr("name");
//     let isClicked = fil.attr("clicked") === "true";
    
//     console.log("Filter clicked:", {type: filterType, name: buttonName, wasClicked: isClicked});

//     // Handle the filter updates
//     switch(filterType) {
//         case 'borough':
//             if (isClicked) {
//                 filteredBorough = filteredBorough.filter(b => b !== buttonName);
//                 if (filteredBorough.length === 0) {
//                     filteredBorough = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
//                     d3.selectAll(".borough-filter")
//                         .style("background-color", "#ffc63d")
//                         .attr("clicked", "true");
//                     return;
//                 }
//             } else {
//                 filteredBorough.push(buttonName);
//             }
//             break;
            
//         case 'rider':
//             const riderValue = buttonName === "Member" ? "m" : "c";
//             if (isClicked) {
//                 filteredRiderType = filteredRiderType.filter(t => t !== riderValue);
//                 if (filteredRiderType.length === 0) {
//                     filteredRiderType = ["m", "c"];
//                     d3.selectAll(".rider-filter")
//                         .style("background-color", "#ffc63d")
//                         .attr("clicked", "true");
//                     return;
//                 }
//             } else {
//                 filteredRiderType.push(riderValue);
//             }
//             break;
            
//         case 'bike':
//             const bikeValue = buttonName === "Regular" ? "cb" : "eb";
//             if (isClicked) {
//                 filteredBikeType = filteredBikeType.filter(t => t !== bikeValue);
//                 if (filteredBikeType.length === 0) {
//                     filteredBikeType = ["cb", "eb"];
//                     d3.selectAll(".bike-filter")
//                         .style("background-color", "#ffc63d")
//                         .attr("clicked", "true");
//                     return;
//                 }
//             } else {
//                 filteredBikeType.push(bikeValue);
//             }
//             break;
//     }

//     // Toggle button appearance
//     fil.style("background-color", isClicked ? "white" : "#ffc63d")
//        .attr("clicked", (!isClicked).toString());

//     // Update both visualizations with current state
//     updateVisualizations();
// }

// Add this new function to handle both visualization updates
function updateVisualizations() {
    // Get filtered data for neighborhoods
    let filteredRidesByNeighborhood = parseRidershipNH(
        citiBikeData,
        hour_start,
        hour_end,
        month_start,
        month_end,
        filteredRiderType.length === 0 ? "all" : filteredRiderType,
        filteredBikeType.length === 0 ? "all" : filteredBikeType
    );

    // Get filtered data for boroughs
    let filteredRidesByBorough = parseRidershipBoro(
        bikeDataBoro,
        hour_start,
        hour_end,
        month_start,
        month_end,
        filteredRiderType.length === 0 ? "all" : filteredRiderType,
        filteredBikeType.length === 0 ? "all" : filteredBikeType
    );

    // Update map
    updateMap(filteredRidesByNeighborhood);

    // Update bar chart
    updateBarChart(filteredRidesByBorough);
}

// Update the updateMap function
function updateMap(filteredRides) {

    const maxRides = Math.max(1, d3.max(Object.values(filteredRides)));
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxRides]);

    mapSvg.select(".neighborhood-layer")
        .selectAll("path.neighborhood")
        .transition()
        .duration(200)
        .attr("fill", d => {
            const rides = filteredRides[d.properties.ntaname] || 0;
            return colorScale(rides);
        });

    updateLegend(colorScale);
}

// Update the bar chart update function
// function updateBarChart(filteredRides) {
//     // Convert borough data to array format
//     const boroughData = Object.entries(filteredRides)
//         .filter(([boro]) => filteredBorough.includes(boro))
//         .map(([boro, count]) => ({
//             borough: boro,
//             count: count || 0
//         }));

//     // Update scales
//     const xScale = d3.scaleBand()
//         .domain(boroughData.map(d => d.borough))
//         .range([0, barChartWidth])
//         .padding(0.1);

//     const yScale = d3.scaleLinear()
//         .domain([0, d3.max(boroughData, d => d.count) || 1000])
//         .range([barChartHeight, 0]);

//     // Update bars
//     chartArea.selectAll(".bar")
//         .data(boroughData)
//         .join("rect")
//         .attr("class", "bar")
//         .transition()
//         .duration(200)
//         .attr("x", d => xScale(d.borough))
//         .attr("y", d => yScale(d.count))
//         .attr("width", xScale.bandwidth())
//         .attr("height", d => barChartHeight - yScale(d.count))
//         .attr("fill", "steelblue");

//     // Update axes
//     annotations.select(".x.axis")
//         .transition()
//         .duration(200)
//         .call(d3.axisBottom(xScale));

//     leftAxisG.transition()
//         .duration(200)
//         .call(d3.axisLeft(yScale));
// }

// Subway overlay toggle handler
// function toggleSubwayOverlay() {
//     let button = d3.select("#subway-toggle");
//     let isVisible = button.attr("clicked") === "true";
    
//     button.attr("clicked", !isVisible ? "true" : "false")
//           .style("background-color", !isVisible ? "#ffc63d" : "white")
//           .text(!isVisible ? "Hide Subway Routes" : "Show Subway Routes");
    
//     if (!isVisible) {
//         showSubwayLines();
//     } else {
//         hideSubwayLines();
//     }
// }



// Update the updateFiltered function to handle hour-level filtering
// function updateFiltered() {
//     // Update the map with current filters and time range
//     updateMap(hour_start, hour_end, month_start, month_end, filteredBorough, filteredRiderType);
//     // ... rest of your updateFiltered code ...
// }

// Clear all filters
// function clear() {
//     // Reset all filters to initial state
//     filteredBorough = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
//     filteredRiderType = ["m", "c"];
//     filteredBikeType = ["cb", "eb"];
    
//     // Reset all buttons to selected state (yellow)
//     d3.selectAll(".borough-filter, .rider-filter, .bike-filter")
//         .style("background-color", "#ffc63d")
//         .attr("clicked", "true");
    
//     // Reset time range variables
//     hour_start = 0;
//     hour_end = 23;
//     month_start = 1;
//     month_end = 12;
    
//     // Clear the brushes on both sliders
//     d3.select(".month-brush")
//         .call(monthBrush.move, null);
    
//     d3.select(".hour-brush")
//         .call(hourBrush.move, null);
    
//     // Reset subway toggle
//     showSubwayOverlay = false;
//     d3.select("#subway-toggle")
//         .style("background-color", "white")
//         .text("Show Subway Routes");
//     hideSubwayLines();
    
//     // Update visualizations with reset state
//     updateVisualizations();
// }

// // Functions to show/hide subway lines
// function showSubwayLines() {
//     d3.select(".subway-layer").style("visibility", "visible");
// }

// function hideSubwayLines() {
//     d3.select(".subway-layer").style("visibility", "hidden");
// }

// Update visualization based on filtered data
// function updateVisualization(filteredData) {
// // Update your main visualization here
// // This function should handle updating all visual elements
// // based on the current filtered dataset

// // Update time series if it exists
// if (typeof makePath === 'function') {
//     makePath();
// }

// // Update map
// updateMap(filteredData);

// // Update any other visualizations
// updateStatistics(filteredData);
// }


// Initialize everything
renderMap()

// Modify the updateMap function
// function updateMap(hourStart, hourEnd, monthStart, monthEnd, boroughFilter, riderFilter) {
//     // Check if data is loaded
//     if (!neighborhoodFeatures || !citiBikeData) {
//         console.log("Data not yet loaded");
//         return;
//     }

//     console.log("Updating map with:", {
//         hourStart, hourEnd, monthStart, monthEnd,
//         boroughFilter, riderFilter
//     });

//     const mapSvg = d3.select("#citibike_map");
    
//     // Calculate filtered rides for each neighborhood using parseRidershipNH
//     let filteredRidesByNeighborhood = parseRidershipNH(
//         citiBikeData,
//         hourStart,  // start hour
//         hourEnd,    // end hour
//         monthStart, // start month
//         monthEnd,   // end month
//         riderFilter === "Member" ? "m" : riderFilter === "Casual" ? "c" : "all"  // convert rider type to match data format
//     );
    
//     // Update color scale with new data
//     const colorScale = d3.scaleSequential(d3.interpolateBlues)
//         .domain([0, d3.max(Object.values(filteredRidesByNeighborhood)) || 1]);
    
//     // Update neighborhood paths
//     const neighborhoods = mapSvg.select(".neighborhood-layer")
//         .selectAll("path.neighborhood")
//         .data(neighborhoodFeatures.features);

//     neighborhoods
//         .transition()
//         .duration(200)
//         .attr("fill", d => {
//             const rides = filteredRidesByNeighborhood[d.properties.ntaname] || 0;
//             return colorScale(rides);
//         });

//     // Update tooltips
//     neighborhoods.select("title")
//         .text(d => {
//             const rides = filteredRidesByNeighborhood[d.properties.ntaname] || 0;
//             return `${d.properties.ntaname}\nTotal Rides: ${rides.toLocaleString()}`;
//         });
    
//     // Update legend
//     updateLegend(colorScale);
// }

// // Add this function to update the legend
// function updateLegend(colorScale) {
//     const mapSvg = d3.select("#citibike_map");
//     const legendWidth = 200;
    
//     const legendScale = d3.scaleLinear()
//         .domain(colorScale.domain())
//         .range([0, legendWidth]);
    
//     const legendAxis = d3.axisBottom(legendScale)
//         .ticks(5)
//         .tickFormat(d3.format(",.0f"));
    
//     mapSvg.select(".legend-axis")
//         .transition()
//         .duration(200)
//         .call(legendAxis);
    
//     // Update gradient
//     const linearGradient = mapSvg.select("#legend-gradient");
    
//     linearGradient.selectAll("stop")
//         .data(colorScale.ticks().map((t, i, n) => ({ 
//             offset: `${i*100/n.length}%`,
//             color: colorScale(t) 
//         })))
//         .join("stop")
//         .attr("offset", d => d.offset)
//         .attr("stop-color", d => d.color);
// }

// // Modify your existing time slider callback
// function timeSliderCallback(timeStart, timeEnd) {
//     // Update the map with new time range
//     updateMap(hour_start, hour_end, month_start, month_end, filteredBorough, filteredRiderType);
//     // ... your existing time slider code ...
// }