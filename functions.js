
//----------parse citibike data based on paremeters---------
//rider-type can either be "all", "m", or "c"
//bike-type can either be "all", "cb", or "eb"
function parseRidershipNH(ridership_by_nta, data_filter){

  let counts = {}

  console.log(ridership_by_nta)
  Object.entries(ridership_by_nta).forEach(([ntaname, nta_counts]) => {
    nta_count = 0;
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
    counts[ntaname] = nta_count
  });
  return counts
};




function parseRidershipBoro(ridership_by_boro, start_hour=0, end_hour=23, start_month=1, end_month=12, rider_type="all", bike_type="all"){
  //loop over hours
  let rider_array;
  if (rider_type == "all"){
    rider_array = ["m", "c"]
  } else {
    rider_array = [rider_type]
  }

  let bike_array;
  if (bike_type == "all"){
    bike_array = ["cb", "eb"]
  } else {
    bike_array = [bike_type]
  }

  let counts = {}

  Object.entries(ridership_by_boro).forEach(([boro, boro_counts]) => {
    boro_count = 0;
    for (let hour = start_hour; hour <= end_hour; hour++) {
      for (let month = start_month; month  <= end_month; month++){
        rider_array.forEach(rider_type=>{
          bike_array.forEach(bike_type=>{
            let value = boro_counts[`${hour}_${month}_${rider_type}_${bike_type}`];
            if (!isNaN(value)){
              boro_count += value
            }
          })
        })
      }
    }
    counts[boro] = boro_count
  });
  return counts
};




//---------do the initial draw of the bar chart-------


//---------- draw the time sliders-----------
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
  const slidermargin = {
      top: 5,
      right: 30,
      bottom: 50,
      left: 30
  };

  const controlSvg = control.append("svg")
      .attr("width", controlWidth)
      .attr("height", controlHeight + slidermargin.bottom);

  // Create scales for the month slider
  const monthScale = d3.scaleLinear()
      .domain([1, 12])
      .range([slidermargin.left, controlWidth - slidermargin.right]);

  // Create scale for the hour slider
  const hourScale = d3.scaleLinear()
      .domain([0, 23])
      .range([slidermargin.left, controlWidth - slidermargin.right]);

  // Create the month brush
  monthBrush = d3.brushX()
      .extent([[slidermargin.left, slidermargin.top], [controlWidth - slidermargin.right, 30]])
      .on("brush", brushedMonth)
      .on("end", brushendedMonth);

  // Create the hour brush (remove 'const')
  hourBrush = d3.brushX()
      .extent([[slidermargin.left, 55], [controlWidth - slidermargin.right, 80]])
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
      .attr("x", slidermargin.left)
      .attr("y", 15)
      .text("Month Range")
      .style("font-size", "12px");

  controlSvg.append("text")
      .attr("x", slidermargin.left)
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
          drawBar(hour_start, hour_end, month_start, month_end);  // Add this line
      }
  }
  
  function brushedHour(event) {
      if (event.selection) {
          const [x0, x1] = event.selection;
          hour_start = Math.round(hourScale.invert(x0));
          hour_end = Math.round(hourScale.invert(x1));
          updateMap(hour_start, hour_end, month_start, month_end, filteredBorough, filteredRiderType);
          drawBar(hour_start, hour_end, month_start, month_end);  // Add this line
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

//-----------function to draw the filters




//----------one-time setup--------
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



//drawing the time slider
function drawSlider(){
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
};


//drawing the bar chart
function drawBar(hour_start = 0, hour_end = 23, month_start = 1, month_end = 12) {
  // Get ridership by borough with time parameters
  let ridershipByBoro = parseRidershipBoro(
      bikeDataBoro,
      hour_start,
      hour_end,
      month_start,
      month_end,
      filteredRiderType === "Member" ? "m" : filteredRiderType === "Casual" ? "c" : "all"
  );

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
}


function drawUpdateNeighborhoodsMap(path,neighborhoods,ridesByNeighborhood,colorScale){
  // Draw out the neighborhoods
  let neighborhoodLayer = d3.select("g.neighborhood-layer")

  neighborhoodLayer.selectAll("path.neighborhood")
        .data(neighborhoods.features)
        .join("path")
        .attr("class", "neighborhood")
        .attr("d", path)
        .attr("fill", d => {
            const rides = ridesByNeighborhood[d.properties.ntaname] || 0;
            return colorScale(rides);
        })
        .attr("stroke", "white")
        .attr("stroke-width", "0.5px")
        .append("title")
        .text(d => {
            const rides = ridesByNeighborhood[d.properties.ntaname] || 0;
            return `${d.properties.ntaname}\nTotal Rides: ${rides.toLocaleString()}`; 
        });
}


//--------------handling interaction---------------

name_map = {
  "Member": "m",
  "Casual": "c",
  "Regular": "cb",
  "E-Bike": "eb"
}

//filter is toggled
function filterClick(button, filterTyp) {
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
  
  parseRidershipNH(counts_by_ntaname, data_filter)
  // Update the map with current filters and time range
  updateMap(time_start, time_end, filteredBorough, filteredRiderType);
}

//actual updating of the map
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


//subway show/hide is toggled
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


// Create Bar Chart
// function createBarChart() {
//     const barChart = d3.select("#bar-chart");
    
//     const barMargin = { top: 10, right: 30, bottom: 90, left: 70 }; // adjust
//     const barWidth = barChart.attr("width");
//     const barHeight = barChart.attr("height");
//     const barChartWidth = barWidth - barMargin.left - barMargin.right;
//     const barChartHeight = barHeight - barMargin.top - barMargin.bottom;

//     let annotations = barChart.append("g").attr("id", "annotations1");
//     let chartArea = barChart.append("g").attr("id", "points")
//             .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");

//     // Aggregate trips by borough
//     const boroughData = boroughs.map(borough => ({
//         borough,
//         count: Object.entries(filteredData)
//             .filter(([neighborhood]) => neighborhood.includes(borough))
//             .reduce((sum, [, trips]) => sum + trips, 0)
//     }));

//     const xScale = d3.scaleBand()
//         .domain(boroughData.map(d => d.borough))
//         .range([margin.left, width - margin.right])
//         .padding(0.2);

//     const yScale = d3.scaleLinear()
//         .domain([0, d3.max(boroughData, d => d.count)])
//         .range([height - margin.bottom, margin.top]);

//     // Axes
//     svg.append("g")
//         .attr("transform", `translate(0,${height - margin.bottom})`)
//         .call(d3.axisBottom(xScale));

//     svg.append("g")
//         .attr("transform", `translate(${margin.left},0)`)
//         .call(d3.axisLeft(yScale));

//     // Bars
//     svg.selectAll(".bar")
//         .data(boroughData)
//         .join("rect")
//         .attr("class", "bar")
//         .attr("x", d => xScale(d.borough))
//         .attr("y", d => yScale(d.count))
//         .attr("width", xScale.bandwidth())
//         .attr("height", d => height - margin.bottom - yScale(d.count))
//         .attr("fill", "steelblue");
// }
