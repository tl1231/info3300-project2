//----------Part 1: drawing the inital view on the page
// setting up filter options and selections
const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
const riderTypes = ["Member", "Casual"];
const bikeTypes = ["Regular", "E-Bike"];


let monthBrush;
let hourBrush;

let bikeDataBoro;  
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
const barMargin = { top: 0, right: 30, bottom: 45, left: 70 }; // adjust
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
    const [neighborhoods, bikeDataNTA, subways, bikeDataBoro,ACS_NTA] = await Promise.all([
        d3.json("data/2020 Neighborhood Tabulation Areas (NTAs).geojson"), 
        d3.json("data/counts_by_ntaname.json"),
        d3.json("data/Subway_Lines.geojson"),
        d3.json("data/counts_by_boro.json"),
        d3.json("data/ACS_NTA.json")
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
    console.log(Object.values(ridesByNeighborhood));
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
            const rides = ridesByNeighborhood[d.properties.ntaname] || 0; 
            return colorScale(rides);
        })
        .attr("stroke", "#D3D3D3")
        .attr("stroke-width", "0.5px")
        .on("click", function(event, d) {
            updateNTAProfile(d.properties.ntaname);
        
            d3.selectAll(".neighborhood").style("stroke-width", "0.3px");
            d3.select(this)
                .style("stroke-width", "1px")
                .style("stroke","gray");
        })
        .append("title")
        .text(d => {
            const rides = ridesByNeighborhood[d.properties.ntaname] || 0;
            return `${d.properties.ntaname}\nTotal Rides: ${rides.toLocaleString()}`; 
        });

    subwayLayer.selectAll("path")
        .data(subways.features)
        .join("path")
        .attr("class", "subway")
        .attr("d", path)
        .attr("fill", 'none')
        .attr("stroke", "black")
        .attr("stroke-width", "0.3px");

    
    //-- adding zoom functionality
    const mapWidth = width - margin.left - margin.right;
    const mapHeight = height - margin.top - margin.bottom;
    
    
    const viewport = mapSvg.append("g")
        .attr("class", "viewport")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    
    neighborhoodLayer.remove();
    subwayLayer.remove();
    viewport.append(() => neighborhoodLayer.node());
    viewport.append(() => subwayLayer.node());
    
    
    let zoom = d3.zoom()
        .scaleExtent([1, 20])  
        .translateExtent([
            [-50, -50], 
            [mapWidth + 50, mapHeight + 50]
        ]) 
        .on("zoom", mapZoomed);
    
    mapSvg.call(zoom);
    
    mapSvg.call(zoom.transform, d3.zoomIdentity);
    
    function mapZoomed({transform}) {
        viewport.attr("transform", transform.toString());
        
        viewport.selectAll(".neighborhood")
            .style("stroke-width", 0.5 / transform.k);
        
        viewport.selectAll(".subway")
            .style("stroke-width", 0.3 / transform.k);
    }

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
        // Time slider setup with adjusted dimensions
        const control = d3.select("#control");
        const controlWidth = 600;
        const controlHeight = 90;  // Increased to accommodate two sliders
        const slidermargin = {
            top: 5,
            right: 30,
            bottom: 50,
            left: 90
        };

        const controlSvg = control.append("svg")
            .attr("width", controlWidth)
            .attr("height", controlHeight + slidermargin.bottom);

        // Create scale for the month slider
        const monthScale = d3.scaleLinear()
            .domain([1, 12])
            .range([slidermargin.left, controlWidth - slidermargin.right]);

        // Create scale for the hour slider
        const hourScale = d3.scaleLinear()
            .domain([0, 23])
            .range([slidermargin.left, controlWidth - slidermargin.right]);

        // Create the month brush
        monthBrush = d3.brushX()
            .extent([[slidermargin.left, slidermargin.top], [controlWidth - slidermargin.right, 35]])
            .on("brush", brushedMonth)
            .on("end", brushendedMonth);

        // Create the hour brush 
        hourBrush = d3.brushX()
            .extent([[slidermargin.left, 80], [controlWidth - slidermargin.right, 110]])
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
            .attr("transform", `translate(0, 35)`)
            .call(monthAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        controlSvg.append("g")
            .attr("transform", `translate(0, 110)`)
            .call(hourAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Labels
        controlSvg.append("text")
            .attr("x", slidermargin.left-90)
            .attr("y", 20)
            .text("Month Range:")
            .style("font-size", "12px");

        controlSvg.append("text")
            .attr("x", slidermargin.left-87)
            .attr("y", 100)
            .text("Hour Range:")
            .style("font-size", "12px");

        // Brush event handlers
        function brushedMonth(event) {
            if (event.selection) {
                const [x0, x1] = event.selection;
                data_filter['month_start'] = Math.round(monthScale.invert(x0));
                data_filter['month_end'] = Math.round(monthScale.invert(x1));
                updateMap();
                updateBarChart();
            }
        }
        
        function brushedHour(event) {
            if (event.selection) {
                const [x0, x1] = event.selection;
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
                    .text("Reset Filters")
                    .on("click", clear);

        // Create borough filter checkboxes
        boroughs.forEach((borough) => {
            let label = boroughFilters
                    .append("label")
                    .attr("class", "filter-label")
            label  
                .append("input")
                .attr("type", "checkbox")
                .attr("name", borough)
                .attr("class", "borough-filter")
                .attr("checked", true) // Start as selected
                .on("change", function () {
                    filterClick(this, 'borough');
                });
                
            label.append("span").text(borough);
        });


        // Create rider type filter checkboxes
        riderTypes.forEach((type) => {
            let label = riderFilters
                    .append("label")
                    .attr("class", "filter-label")
            label  
                .append("input")
                .attr("type", "checkbox")
                .attr("name", type)
                .attr("class", "rider-filter")
                .attr("checked", true) 
                .on("change", function () {
                    filterClick(this, 'rider');
                });
                
            label.append("span").text(type);
        });
 

        // Create bike type filter checkboxes
        bikeTypes.forEach((type) => {
            let label = bikeFilters
                    .append("label")
                    .attr("class", "filter-label")
            label  
                .append("input")
                .attr("type", "checkbox")
                .attr("name", type)
                .attr("class", "bike-filter")
                .attr("checked", true) 
                .on("change", function () {
                    filterClick(this, 'bike');
                });
                
            label.append("span").text(type);
        });

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
                .range(["#D96C4D", "#6DBF73", "#4C8FD9", "#D96BB1"])
    
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

    //draw horizontal bar
    const initial_vehicle_data = {
        "No Vehicle": 0.46,
        "Has Vehicle": 0.54
    };

    function updateNTAProfile(ntaname){
        NTA_into = getNeighborhoodInfo(ntaname);
        d3.select("#NTAProfileName").text(ntaname)

        if (Number.isNaN(NTA_into['bikeModeShare'])){
            d3.select("#NTAProfileTopShare").text("No Data :(")
            d3.select("#NTAProfileBikeShare").text("No Data :(")

        } else {
            let bike_share = (NTA_into['bikeModeShare']*100).toFixed(2);
            let bike_share_str= `${bike_share}%`

            //updating the names in the NTA profile on the index.html:
            
            d3.select("#NTAProfileTopShare").text(NTA_into['highestModeShare'])
            d3.select("#NTAProfileBikeShare").text(bike_share_str)

            
            updatehorizontalBar(NTA_into["shareNoCar"]);
        }
    }

    function drawhorizontalBar() {
        const barChart = d3.select("#neighborhood_viz")
            .append("g")
            .attr("id", "car-bar");  
       
        let carbarHeight = 30;
        let carbarWidth = 300;  
    
        const initial_vehicle_counts = Object.entries(initial_vehicle_data).map(([key, value]) => ({
            key: key,
            value: value,
            width: value * carbarWidth
        }));

        barChart.selectAll('rect')
            .data(initial_vehicle_counts)
            .join('rect')
            .attr('x', (d, i) => i * initial_vehicle_counts[0].width)
            .attr('y', 0)
            .attr('width', d => d.width)
            .attr('height', carbarHeight)
            .attr('fill', d => d.key === "Has Vehicle" ? "#4381D9" : "#E29344")
            .attr("stroke", "black")
            .style("stroke-width", "1px");

        const legend = d3.select('#neighborhood_viz')
            .append("g")
            .attr("id", "car-legend")
            .attr("transform", `translate(0, ${carbarHeight + 15})`);  

        legend.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("x", 2)
            .attr("y", 0)
            .attr("fill", "#E29344");

        legend.append("text")
            .attr("x", 22)
            .attr("y", 12)
            .text("Share of households with no vehicle: 46%")
            .style("font-size", "16px");

        legend.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("x", 2)
            .attr("y", 30)
            .attr("fill", "#4381D9");

        legend.append("text")
            .attr("x", 22)
            .attr("y", 42)
            .text("Share of households with 1+ vehicles: 54%")
            .style("font-size", "16px");

    }
    
    function updatehorizontalBar(shareNoCar) {
        
        let vehicle_dict = {
            "No Vehicle": shareNoCar,
            "Has Vehicle": 1 - shareNoCar
        };
    
        const barWidth = 300; 
        
        const horizontalbarData = Object.entries(vehicle_dict).map(([key, value]) => ({
            key: key,
            value: value,
            width: value * barWidth
        }));
    
        d3.select("#car-bar").selectAll('rect')
            .data(horizontalbarData)
            .join('rect')
            .transition()
            .duration(200)
            .attr('x', (d, i) => i === 0 ? 0 : horizontalbarData[0].width)
            .attr('width', d => d.width)
            .attr('fill', d => d.key === "Has Vehicle" ? "#4381D9" : "#E29344");


        
    }

    function updatehorizontalBarNoData() {

    }


    drawhorizontalBar();

    //--handling function for the clickers--
    // function filterClick(button, filterType) {
    function filterClick(checkbox, filterType) {
        // let fil = d3.select(button);
        let fil = d3.select(checkbox);
        let name_map = {
            "Member": "m",
            "Casual": "c",
            "Regular": "cb",
            "E-Bike": "eb"
        }
        
        if (filterType === 'borough') {
            if (checkbox.checked) {
                data_filter['boros'].push(fil.attr("name"));           
            } else {
                let index = data_filter['boros'].indexOf(fil.attr("name"));
                if (index > -1) {
                    data_filter['boros'].splice(index, 1);
                }
            }
        } else if (filterType === 'rider') {
            let selection_code = name_map[fil.attr("name")];
            if (checkbox.checked) {
                if (!data_filter['ride_type'].includes(selection_code)) {
                    data_filter['ride_type'].push(selection_code);
                }
            } else {
                let index = data_filter['ride_type'].indexOf(selection_code);
                if (index > -1) {
                    data_filter['ride_type'].splice(index, 1);
                }
            }
        } else if (filterType === 'bike') {
            let selection_code = name_map[fil.attr("name")];
            if (checkbox.checked) {
                if (!data_filter['bike_type'].includes(selection_code)) {
                    data_filter['bike_type'].push(selection_code);
                }
            } else {
                let index = data_filter['bike_type'].indexOf(selection_code);
                if (index > -1) {
                    data_filter['bike_type'].splice(index, 1);
                }
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
                    for (let month = data_filter["month_start"]; month  <= data_filter["month_end"]; month++){
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
            for (let month = data_filter["month_start"]; month  <= data_filter["month_end"]; month++){
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
        
        
        // Reset all checkboxes to checked state
        d3.selectAll(".borough-filter, .rider-filter, .bike-filter, #subway-toggle")
            .property("checked", true);
        
        // Clear the brushes on both sliders
        d3.select(".month-brush")
            .call(monthBrush.move, null);
        
        d3.select(".hour-brush")
            .call(hourBrush.move, null);
        
        // Reset subway toggle
        d3.select("#subway-toggle")
            .text("Hide Subway Routes");
        
        // Reset horizontal bar
        const barWidth = 200;
        const barData = Object.entries(initial_vehicle_data).map(([key, value]) => ({
            key: key,
            value: value,
            width: value * barWidth
        }));
    
        d3.select("#car-bar").selectAll('rect')
            .data(barData)
            .join('rect')
            .transition()
            .duration(200)
            .attr('x', (d, i) => i === 0 ? 0 : barData[0].width)
            .attr('width', d => d.width)
            .attr('fill', d => d.key === "Has Vehicle" ? "#4381D9" : "#E29344")
        // Update visualizations with reset state
        d3.select("#NTAProfileName").text("New York City")

        d3.selectAll(".neighborhood").style("stroke-width", "0.5px");

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
                    .style("background-color", "#E29344")
                    .text("Hide Subway Routes");
        }
        
        updateMap();
    }

    //return the relevent acs data
    function getNeighborhoodInfo (nta_name){
        let share_no_car = ACS_NTA[nta_name]['vehicle_0']/ACS_NTA[nta_name]['vehicle_total']
        let modeshares = {
            "Driving": ACS_NTA[nta_name]['work_transit_drove'],
            "Public Transit": ACS_NTA[nta_name]['work_transit_public_transit'],
            "Biking": ACS_NTA[nta_name]['work_transit_bike'],
            "Walking": ACS_NTA[nta_name]['work_transit_walked'],
            "Other": ACS_NTA[nta_name]['work_transit_other'],
            "Work From Home": ACS_NTA[nta_name]['work_transit_home']
        }

        let highestModeShare;
        let maxValue=0;
        Object.keys(modeshares).forEach(key => {
            if (modeshares[key] > maxValue) {
                maxValue = modeshares[key];
                highestModeShare = key;
            }
        });

        let bike_mode_share = ACS_NTA[nta_name]['work_transit_bike']/ACS_NTA[nta_name]['work_transit_total']

        let returnDict = {
            "shareNoCar": share_no_car,
            "highestModeShare": highestModeShare,
            "bikeModeShare": bike_mode_share
        };

        return returnDict;
    }


    function getACSData(nta_name){
        num_no_car = ACS_NTA[nta_name]['vehicle_0']
        total_car = ACS_NTA[nta_name]['vehicle_total']
        share_car = 1-(num_no_car/total_car)

        return share_car
    }

    
};



// Initialize everything
renderMap();


// updating the legend
function updateLegend(colorScale) {
    const mapSvg = d3.select("#citibike_map");
    const legendWidth = 200;
    const legendHeight = 10; 
    
    const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
        .ticks(4)
        .tickFormat(d3.format(",.0f"));
    
    let defs = mapSvg.selectAll("defs").data([0]).join("defs");
    
    let gradient = defs.selectAll("linearGradient")
        .data([0])
        .join("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    const stops = d3.range(0, 1.1, 0.1).map(t => ({
        offset: `${t * 100}%`,
        color: d3.interpolateBlues(t)
    }));

    gradient.selectAll("stop")
        .data(stops)
        .join("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    const legend = mapSvg.selectAll("g.legend")
        .data([0])
        .join("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin.left}, ${height - margin.bottom - 40})`);

    legend.selectAll("rect.legend-background")
        .data([0])
        .join("rect")
        .attr("class", "legend-background")
        .attr("x", -8)
        .attr("y", -25)  
        .attr("width", legendWidth + 20)
        .attr("height", 70)  
        .attr("fill", "#f0f0f0")  
        .attr("rx", 5) 
        .attr("ry", 5);

    legend.selectAll("text.legend-title")
        .data([0])
        .join("text")
        .attr("class", "legend-title")
        .attr("x", 0)
        .attr("y", -8) 
        .style("font-size", "10px")
        .text("Trip Origins per Neighborhood:");

    legend.selectAll("rect.color-bar")
        .data([0])
        .join("rect")
        .attr("class", "color-bar")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    legend.selectAll("g.legend-axis")
        .data([0])
        .join("g")
        .attr("class", "legend-axis")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);
}