//----------parse citibike data based on paremeters---------
//rider-type can either be "all", "m", or "c"
//bike-type can either be "all", "cb", or "eb"
function parseRidershipNH(ridership_by_nta, start_hour=0, end_hour=23, start_month=1, end_month=12, rider_type="all", bike_type="all"){
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

  Object.entries(ridership_by_nta).forEach(([ntaname, nta_counts]) => {
    nta_count = 0;
    for (let hour = start_hour; hour <= end_hour; hour++) {
      for (let month = start_month; month  <= end_month; month++){
        rider_array.forEach(rider_type=>{
          bike_array.forEach(bike_type=>{
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








//----------one-time setup--------
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


//--------------handling interaction---------------
//filter is toggled
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
function createBarChart() {
    const barChart = d3.select("#bar-chart");
    
    const barMargin = { top: 10, right: 30, bottom: 90, left: 70 }; // adjust
    const barWidth = barChart.attr("width");
    const barHeight = barChart.attr("height");
    const barChartWidth = barWidth - barMargin.left - barMargin.right;
    const barChartHeight = barHeight - barMargin.top - barMargin.bottom;

    let annotations = barChart.append("g").attr("id", "annotations1");
    let chartArea = barChart.append("g").attr("id", "points")
            .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");

    // Aggregate trips by borough
    const boroughData = boroughs.map(borough => ({
        borough,
        count: Object.entries(filteredData)
            .filter(([neighborhood]) => neighborhood.includes(borough))
            .reduce((sum, [, trips]) => sum + trips, 0)
    }));

    const xScale = d3.scaleBand()
        .domain(boroughData.map(d => d.borough))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(boroughData, d => d.count)])
        .range([height - margin.bottom, margin.top]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));

    // Bars
    svg.selectAll(".bar")
        .data(boroughData)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.borough))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d.count))
        .attr("fill", "steelblue");
}
