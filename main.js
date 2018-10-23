const API_KEY = 'fa0eb65102574cfd90f3a4173cf518ac';

const typesOfRoutes = new Map(
  [
    [0, 'Light Rail'],
    [1, 'Heavy Rail'],
    [2, 'Commuter Rail'],
    [3, 'Bus'],
    [4, 'Ferry']
  ]
);

const busVars = {
  routeId: undefined,
  directionId: undefined,
  directionName: undefined,
  stopId: undefined,
  stopName: undefined,
  currentTime: undefined
}

const busData = {
  listOfRoutes: [],
  listOfDirections: [],
  listOfStops: [],
  listOfPredictions: [],
  listOfAlerts: [],       // Alerts associated with the results of a predictions query
  listOfTrips: new Map()  // Trips associated with the results of a prediction query
}

// Clears relevant data when a new selection is made by the user
function clearData(fromFunctionName) {
  if (fromFunctionName === 'route') {
    clearDirections();
    clearStops();
    clearPredictions();
  }
  else if (fromFunctionName === 'direction') {
    clearStops();
    clearPredictions();
  }
  else if (fromFunctionName === 'stop') {
    clearPredictions();
  }
}

// Clears direction data and frontend
function clearDirections() {
  busVars.directionId = undefined;
  busVars.directionName = undefined;
  busData.listOfDirections.length = 0;
  document.querySelector('#dropdown_directions').innerHTML = '';
}

// Clears stop data and frontend
function clearStops() {
  busVars.stopId = undefined;
  busVars.stopName = undefined;
  busData.listOfStops.length = 0;
  document.querySelector('#dropdown_stops').innerHTML = '';
}

// Clears predictions data and frontend
function clearPredictions() {
  busData.listOfPredictions.length = 0;
  busData.listOfAlerts.length = 0;
  busData.listOfTrips.clear();
  document.querySelector('#predictions').innerHTML = '';
}

// Returns data from the specified URL
function getData(url) {
  return fetch(url);
};

function convertDataToJson(data) {
  // Logs the time at which the URL was fetched
  busVars.currentTime = Date.now();
  return data.json();
}

function processRouteList(jsonData) {
  // Clear existing data
  busData.listOfRoutes.length = 0;
  // Add new data from JSON
  jsonData.data.map( (route) => {
    busData.listOfRoutes.push({
      'routeId': route.id,
      'type': typesOfRoutes.get(route.attributes.type),
      'short_name': route.attributes.short_name,
      'long_name': route.attributes.long_name,
    });
  });
  // console.log(busData.listOfRoutes);
  return busData.listOfRoutes;
}

function showRouteList(list) {
  let htmlToAdd = '<option>Pick a route...</option>';
  list.forEach( (el) => {
    htmlToAdd += `<option value=${el.routeId}>${el.type} - ${el.short_name} - ${el.long_name}</option>`;
  });
  document.querySelector('#dropdown_routes').innerHTML = htmlToAdd;
}

function processDirectionList(jsonData) {
  // Clear existing data
  busData.listOfDirections.length = 0;
  // Add new data from JSON
  jsonData.data.map( (direction) => {
    busData.listOfDirections.push({
      'directionId': direction.attributes.direction_id,
      'name': direction.attributes.name
    });
  });
  // Sort list by directionId (to group variants together)
  busData.listOfDirections.sort( (a, b) => {
    return a.directionId - b.directionId;
  });
  // console.log(busData.listOfDirections);
  return busData.listOfDirections;
}

function showDirectionList(list) {
  let htmlToAdd = '<option>Pick a direction...</option>';
  list.forEach( (el) => {
    htmlToAdd += `<option value=${el.directionId}>${el.name}</option>`;
  });
  document.querySelector('#dropdown_directions').innerHTML = htmlToAdd;
}

function processStopList(jsonData) {
  // Clear existing data
  busData.listOfStops.length = 0;
  // Add new data from JSON
  jsonData.data.map( (stop) => {
    busData.listOfStops.push({
      'stopId': stop.id,
      'name': stop.attributes.name
    });
  });
  // console.log(busData.listOfStops);
  return busData.listOfStops;
}

function showStopList(list) {
  let htmlToAdd = '<option>Pick a stop...</option>';
  list.forEach( (el) => {
    htmlToAdd += `<option value=${el.stopId}>${el.name}</option>`;
  });
  document.querySelector('#dropdown_stops').innerHTML = htmlToAdd;
}

function processPredictionList(jsonData) {
  // Clear existing trip and alert data
  busData.listOfAlerts.length = 0;
  busData.listOfTrips.clear();
  // Add trip and alert data from jsonData.included
  jsonData.included.forEach( (el) => {
    if (el.type === 'alert') {
      busData.listOfAlerts.push({
        'shortHeader': el.attributes.short_header,
        'updatedDate': el.attributes.updated_at
      });
    }
    else if (el.type === 'trip') {
      busData.listOfTrips.set(el.id, {
          'headsign': el.attributes.headsign
      });
    }
  });
  // Clear existing predictions data
  busData.listOfPredictions.length = 0;
  // Add new data from JSON
  jsonData.data.map( (prediction) => {
    busData.listOfPredictions.push({
      'tripId': prediction.relationships.trip.data.id,
      'departureTime': new Date(prediction.attributes.departure_time),
      'headsign': busData.listOfTrips.get(prediction.relationships.trip.data.id).headsign
    });
  });
  // Sort predictions by departure time low to high (ASC)
  busData.listOfPredictions.sort( (a, b) => {
    return a.departureTime - b.departureTime;
  })
  // Truncate to 5 most recent predictions
  busData.listOfPredictions.length = 3;
  // console.log(busData.listOfPredictions);
  return busData.listOfPredictions;
}

function showPredictionList(list) {
  let htmlToAdd = '';
  if (list.length > 0) {
    list.forEach( (el) => {
      const minutesToDeparture = Math.floor((el.departureTime - busVars.currentTime) / 1000 / 60);
      let timeToOutput = minutesToDeparture > 0 ? minutesToDeparture : 'Arriving';
      htmlToAdd += `<p>${timeToOutput} mins (destination ${el.headsign})</p>`;
    });
  }
  else {
    htmlToAdd = 'No predictions currently available for this stop.';
  }
  if (busData.listOfAlerts.length > 0) {
    busData.listOfAlerts.forEach( (el) => {
      htmlToAdd += `<p>Alert: ${el.shortHeader} (${el.updatedDate})`;
    });
  }
  document.querySelector('#predictions').innerHTML = htmlToAdd;

}

// Populates directions in drop-down based on route
// NOTE: This function works with the older free-text route input, not the dropdown selector.
// function handleRouteSubmit(event) {
//   event.preventDefault();
//   clearData('route'); // Clear any existing data
//   busVars.routeId = event.target.route.value;
//   const url = `https://api-v3.mbta.com/shapes?api_key=${API_KEY}&filter[route]=${busVars.routeId}`;
//   getData(url)
//   .then(convertDataToJson)
//   .then(processDirectionList)
//   .then(showDirectionList);
// }

// Populates directions in dropdown based on route
function handleRouteChange(event) {
  clearData('route'); // Clear any existing data
  busVars.routeId = event.target.value;
  const url = `https://api-v3.mbta.com/shapes?api_key=${API_KEY}&filter[route]=${busVars.routeId}`;
  getData(url)
  .then(convertDataToJson)
  .then(processDirectionList)
  .then(showDirectionList);
}

// Populates stops in dropdown based on direction of route
function handleDirectionChange(event) {
  clearData('direction'); // Clear any existing data
  busVars.directionId = event.target.value;
  const url = `https://api-v3.mbta.com/stops?api_key=${API_KEY}&filter[route]=${busVars.routeId}&filter[direction_id]=${busVars.directionId}`;
  getData(url)
  .then(convertDataToJson)
  .then(processStopList)
  .then(showStopList);
}

// Prints predictions based on that stop/direction/route
function handleStopChange(event) {
  clearData('stop'); // Clear any existing data
  busVars.stopId = event.target.value;
  const url = `https://api-v3.mbta.com/predictions?api_key=${API_KEY}&filter[stop]=${busVars.stopId}&filter[route]=${busVars.routeId}&filter[direction_id]=${busVars.directionId}&include=trip,alerts`;
  getData(url)
  .then(convertDataToJson)
  .then(processPredictionList)
  .then(showPredictionList);
}

// Runs when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get list of routes
  const routeUrl = `https://api-v3.mbta.com/routes?api_key=${API_KEY}`;
  getData(routeUrl)
  .then(convertDataToJson)
  .then(processRouteList)
  .then(showRouteList);
});