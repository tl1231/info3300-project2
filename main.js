//----------Part 1: drawing the inital view on the page
// setting up filter options and selections
const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
const riderTypes = ["Member", "Casual"];
const bikeTypes = ["Regular", "E-Bike"];


let monthBrush;
let hourBrush;

let bikeDataBoro;  // Declare global variable
let neighborhoodFeatures;
let subwayFeature;
let citiBikeData;

const mapSvg = d3.select("#citibike_map");
const width = mapSvg.attr("width");
const height = mapSvg.attr("height");
const margin = { top: 20, right: 20, bottom: 20, left: 20 };

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


// Main function that contains the data within it
const renderMap = async function() {

    // Load all datasets
    const [neighborhoods, bikeDataNTA, subways, bikeDataBoro] = await Promise.all([
        d3.json("data/2020 Neighborhood Tabulation Areas (NTAs).geojson"), 
        d3.json("data/counts_by_ntaname.json"),
        d3.json("data/Subway_Lines.geojson"),
        d3.json("data/counts_by_boro.json")
    ]);

    // Store data globally  // Assign to global variable
    neighborhoodFeatures = neighborhoods;
    subwayFeature = subways;
    citiBikeData = bikeDataNTA;

    //creating a dict from nta name to boroname
    var NTA_Boro_dict = {};

    neighborhoods.features.forEach(feature => {
        NTA_Boro_dict[feature.properties.ntaname] = feature.properties.boroname;
    });

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

    // Create the neighborhood Paths
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
        monthBrush = d3.brushX()
            .extent([[margin.left, margin.top], [controlWidth - margin.right, 30]])
            .on("brush", brushedMonth)
            .on("end", brushendedMonth);

        // Create the hour brush (remove 'const')
        hourBrush = d3.brushX()
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
                // month_start = Math.round(monthScale.invert(x0));
                // month_end = Math.round(monthScale.invert(x1));
                data_filter['month_start'] = Math.round(monthScale.invert(x0));
                data_filter['month_end'] = Math.round(monthScale.invert(x1));
                updateMap();
                updateBarChart();
            }
        }
        
        function brushedHour(event) {
            if (event.selection) {
                const [x0, x1] = event.selection;
                // hour_start = Math.round(hourScale.invert(x0));
                // hour_end = Math.round(hourScale.invert(x1));
                data_filter['hour_start'] = Math.round(monthScale.invert(x0));
                data_filter['hour_end'] = Math.round(monthScale.invert(x1));
                updateMap();
                updateBarChart();
            }
        }

        function brushendedMonth(event) {
            if (!event.selection) {
                data_filter['month_start'] = 1;
                data_filter['month_end'] = 12;
                updateMap();
                updateBarChart();
            }
        }

        function brushendedHour(event) {
            if (!event.selection) {
                data_filter['hour_start'] = 0;
                data_filter['hour_end'] = 23;
                updateMap();
                updateBarChart();
            }
        }
    }
    drawSliders();

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
                .attr("class", "borough-filter")
                .attr("clicked", "true")  // Start as selected
                .text(borough)
                .style("background-color", "#ffc63d")  // Start as selected
                .on("click", function() { filterClick(this, 'borough'); });
        });

        // Create rider type filter buttons
            riderTypes.forEach((type) => {
                riderFilters
                    .append("button")
                    .attr("name", type)
                    .attr("class", "rider-filter")
                    .attr("clicked", "true")  // Start as selected
                    .text(type)
                    .style("background-color", "#ffc63d")  // Start as selected
                    .on("click", function() { filterClick(this, 'rider'); });
            });

        // Create bike type filter buttons
            bikeTypes.forEach((type) => {
                bikeFilters
                    .append("button")
                    .attr("name", type)
                    .attr("class", "bike-filter")
                    .attr("clicked", "true")  // Start as selected
                    .text(type)
                    .style("background-color", "#ffc63d")  // Start as selected
                    .on("click", function() { filterClick(this, 'bike'); });
            });

        // Create subway overlay toggle
            overlayControls
                .append("button")
                .attr("id", "subway-toggle")
                .attr("clicked", 'false')
                .style("background-color", "#ffc63d")
                .text("Hide Subway Routes")
                .on("click", toggleSubwayOverlay);
        
    };
    drawFilters();

    //--draw the bar chart--
    function drawBar() {
        // Get ridership by borough with time parameters
        let ridershipByBoro = parseRidershipBoro();
    
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
                        `translate(${barMargin.left - 10 },${barMargin.top})`
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
        
        return barColorScale;
    }
    let barColorScale = drawBar();

    //--handling function for the clickers--
    function filterClick(button, filterType) {
        let fil = d3.select(button);
        let name_map = {
            "Member": "m",
            "Casual": "c",
            "Regular": "cb",
            "E-Bike": "eb"
        }
        
        if (filterType === 'borough') {
            if (fil.attr("clicked") == "true") {
                if (data_filter['boros'].includes(fil.attr("name"))) {
                    data_filter['boros'].splice(data_filter['boros'].indexOf(fil.attr("name")), 1);
                }
                fil.style("background-color", "white");
                fil.attr("clicked", false);
            } else {
                data_filter['boros'].push(fil.attr("name"));
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
        updateMap();
        updateBarChart();
    } 

    function parseRidershipNH(){

        let counts = {}
        let boro;
      
        Object.entries(bikeDataNTA).forEach(([ntaname, nta_counts]) => {
            nta_count = 0;
            boro = NTA_Boro_dict[ntaname]
            if (data_filter['boros'].includes(boro)){
                for (let hour = data_filter["hour_start"]; hour <= data_filter['hour_end']; hour++) {
                    for (let month = data_filter["month_start"]; month  <= data_filter["month_start"]; month++){
                    data_filter['ride_type'].forEach(rider_type=>{
                        data_filter['bike_type'].forEach(bike_type=>{
                        let value = nta_counts[`${hour}_${month}_${rider_type}_${bike_type}`];
                        if (!isNaN(value)){
                            nta_count += value
                        }
                        })
                    })
                    }
                }
            }  
            counts[ntaname] = nta_count
        });



        return counts
    };

    function parseRidershipBoro(){

        let counts = {}
      
        Object.entries(bikeDataBoro).forEach(([boroName, boro_counts]) => {
          nta_count = 0;
          for (let hour = data_filter["hour_start"]; hour <= data_filter['hour_end']; hour++) {
            for (let month = data_filter["month_start"]; month  <= data_filter["month_start"]; month++){
              data_filter['ride_type'].forEach(rider_type=>{
                data_filter['bike_type'].forEach(bike_type=>{
                  let value = boro_counts[`${hour}_${month}_${rider_type}_${bike_type}`];
                  if (!isNaN(value)){
                    nta_count += value
                  }
                })
              })
            }
          }
          counts[boroName] = nta_count
        });
        return counts
    };

    function updateMap() {

        let filteredRides = parseRidershipNH();

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


        if (data_filter['showSubwayOverlay']){
            subwayLayer.style("visibility", "visible");
        } else {
            subwayLayer.style("visibility", "hidden");
        }

    
    }

    // Update the bar chart update function
    function updateBarChart() {

        let filteredRides = parseRidershipBoro();

        // Convert borough data to array format
        const boroughData = Object.entries(filteredRides)
            .filter(([boro]) => data_filter['boros'].includes(boro))
            .map(([boro, count]) => ({
                borough: boro,
                count: count || 0
            }));

        // Update scales
        const xScale = d3.scaleBand()
            .domain(boroughData.map(d => d.borough))
            .range([0, barChartWidth])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(boroughData, d => d.count) || 1000])
            .range([barChartHeight, 0]);
        
            
        // Update bars
        chartArea.selectAll(".bar")
            .data(boroughData)
            .join("rect")
            .attr("class", "bar")
            .transition()
            .duration(200)
            .attr("x", d => xScale(d.borough))
            .attr("y", d => yScale(d.count))
            .attr("width", xScale.bandwidth())
            .attr("height", d => barChartHeight - yScale(d.count))
            .attr("fill", d => barColorScale(d.borough));

        // Update axes
        annotations.select(".x.axis")
            .transition()
            .duration(200)
            .call(d3.axisBottom(xScale));

        leftAxisG.transition()
            .duration(200)
            .call(d3.axisLeft(yScale));
    }

    // Clear all filters
    function clear() {
        // Reset all filters to initial state
        data_filter = {
            "hour_start": 0,
            "hour_end": 23,
            "month_start": 1,
            "month_end": 11,
            "ride_type": ["m", "c"],
            "bike_type": ["cb", "eb"],
            "showSubwayOverlay": true,
            "boros": ["Manhattan", "Brooklyn", "Queens", "Bronx"]
        }
        
        // Reset all buttons to selected state (yellow)
        d3.selectAll(".borough-filter, .rider-filter, .bike-filter, #subway-toggle")
            .style("background-color", "#ffc63d")
            .attr("clicked", "true");
        
        
        // Clear the brushes on both sliders
        d3.select(".month-brush")
            .call(monthBrush.move, null);
        
        d3.select(".hour-brush")
            .call(hourBrush.move, null);
        
        // Reset subway toggle
        d3.select("#subway-toggle")
            .text("Hide Subway Routes");
        
        // Update visualizations with reset state
        updateMap();
        updateBarChart();
    }

    // Subway overlay toggle handler
    function toggleSubwayOverlay() {
        let button = d3.select("#subway-toggle");

        if (data_filter['showSubwayOverlay']){
            data_filter['showSubwayOverlay'] = false;
            button.attr("clicked", "false")
                    .style("background-color", "white")
                    .text("Show Subway Routes");
        } else {
            data_filter['showSubwayOverlay'] = true;
            button.attr("clicked", "true")
                    .style("background-color", "#ffc63d")
                    .text("Hide Subway Routes");
        }
        
        updateMap();
    }
};



// Initialize everything
renderMap();


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