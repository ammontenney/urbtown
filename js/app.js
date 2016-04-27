var DEFUALT_MAP_CENTER = {lat: 37.2739675, lng: -104.678212}; // center of the USA
var RADIUS_PRESETS = [5,10,15,20,25];
var SELECTED_MARKER_COLOR = 'lightblue';
var MARKER_COLOR = 'red';
var NO_FILTER_MSG = 'No filter applied.';

/**
* @description This is the ViewModel to use with KnockOut.js. This whole app
* pretty much revolves around this class.
* @constructor
*/
function AppViewModel() {
    var t = this;
    var map;
    var geocoder;
    var places;
    var originalResults;

    var coords = DEFUALT_MAP_CENTER;
    // var results;

    var resultsToggleState = false;
    var selectedEntry;



    var $welcomeView = $('.welcome-view');
    var $welcomeError = $('.welcome-error');
    var $loadingNotification = $('.welcome-loading');
    var $results = $('.results');
    var $arrow = $('.arrow');
    var $entryView = $('.entry-view');
    var $welcomeClose = $('.welcome-close');
    var $selectServiceView = $('.select-service-view');

    t.RADIUS_PRESETS = ko.observableArray(RADIUS_PRESETS);

    t.query = ko.observable();
    t.address = ko.observable();
    t.radius = ko.observable();
    t.results = ko.observableArray();
    t.filterQuery = ko.observable();
    t.filterLabel = ko.observable(NO_FILTER_MSG);

    t.welcomeSubmit = welcomeSubmit;
    t.arrowClick = arrowClick;
    t.assignEntryClick = assignEntryClick;
    t.entryMouseOver = entryMouseOver;
    t.openEntry = openEntry;
    t.closeEntry = closeEntry;
    t.openWelcome = openWelcome;
    t.closeWelcome = closeWelcome;
    t.filterClick = filterClick;
    t.clearFilterClick = clearFilterClick;
    t.serviceClick = serviceClick;
    t.gpLoader = gpLoader;
    t.ypLoader = ypLoader;


// =============================================================================
    /**
    * @description Called when the user clicks the Go button on the welcome-view
    */
    function welcomeSubmit() {
        if ( !verifyWelcomeInput() ) return;

        $loadingNotification.css('visibility', 'visible');

        lookupAddressCoords();
    }

    /**
    * @description Make sure the user entered valid input from .welcome-view;
    * @return {boolean} true - user input is valid and welcomeError is hidden;
    * false - user input is not valid; welcomeError is displayed
    */
    function verifyWelcomeInput() {
        if ( !t.query() || !t.address() || !t.radius() ) {
            $welcomeError.text('* indicates a required field');
            $welcomeError.css('display', 'block');
            return false;
        }

        $welcomeError.css('display', 'none');

        return true;
    }

    /**
    * @description Uses GMaps geocode to lookup the coords of an address
    */
    function lookupAddressCoords() {
        geocoder.geocode({'address':t.address()}, geoCallback);
        function geoCallback(geoResults, status) {
            if (status !== google.maps.GeocoderStatus.OK){
                $welcomeError.text('Try again. Address lookup failed: ' + status);
                $welcomeError.css('display', 'block');
                $loadingNotification.css('visibility', 'hidden');
                return;
            }

            t.address(geoResults[0].formatted_address);
            coords.lat = geoResults[0].geometry.location.lat();
            coords.lng = geoResults[0].geometry.location.lng();

            map.setCenter(coords);

            loadQueryResults();
        }
    }

    /**
    * @description Uses GMaps nearbySearch to get query results and displays markers
    */
    function loadQueryResults() {
        var request = {
            location: coords,
            radius: t.radius()*1600, // converts miles to km
            keyword: t.query()
        };

        places.nearbySearch(request, searchCallback);
        function searchCallback(placesResults, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK){
                $welcomeError.text('Try expanding your search radius. Search failed: ' + status);
                $welcomeError.css('display', 'block');
                $loadingNotification.css('visibility', 'hidden');
                return;
            }

            originalResults = placesResults;
            t.results(placesResults);

            // TODO: populate map markers
            addMapMarkers();

            $loadingNotification.css('visibility', 'hidden');
            $welcomeView.css('visibility', 'hidden');
        }
    }

    /**
    * @description Adds a marker icon to each entry in t.results() and displays
    * those markers on the map
    */
    function addMapMarkers() {
        var len = t.results().length;
        var entry = {};
        var icon = createMarkerIcon(MARKER_COLOR);

        for (var i=0; i<len; i++){
            entry = t.results()[i];
            entry.marker = new google.maps.Marker({
                position: entry.geometry.location,
                map: map,
                title: entry.name,
                icon: icon
            });
            google.maps.event.addListener(entry.marker, 'click', markerClick(entry));
        }
    }

    /**
    * @description Creates a customized icon to place on GMaps
    * @param {string} color - any valid HTML color
    * @returns {object} an icon object representing an svg icon
    * https://developers.google.com/maps/documentation/javascript/examples/marker-symbol-custom
    */
    function createMarkerIcon(color){
        var icon = {
            path: 'M 0,0 24,0, 24,24 12,40, 0,24 z',
            fillColor: color,
            fillOpacity: 0.8,
            scale: 0.75,
            strokeColor: 'black',
            strokeWeight: 1,
        };
        return icon;
    }
// -----------------------------------------------------------------------------

// =============================================================================
    /**
    * @description This is called when the user clicks the expand/hide arrow
    * next to the results pane on the left of the screen
    */
    function arrowClick() {
        toggleResults();
    }

    /**
    * @description Use to toggle the off-canvas results pane when the user clicks
    * the arrow to expand / hide the search results. This function depends on the
    * global variable 'resultsToggleState'
    * @param {boolean} display - pass t/f to specify to open/close results pane;
    * if parameter is ommited the  results pane will toggle open/close
    */
    function toggleResults(display){
        if (display !== undefined) {
            resultsToggleState = display;
        }
        else {
            resultsToggleState = !resultsToggleState;
        }

        $results.toggleClass('results-open', resultsToggleState);
        $arrow.toggleClass('flip-arrow', resultsToggleState);
    }
// -----------------------------------------------------------------------------

// =============================================================================
    /**
    * @description Used to assign a function to the KnockOut data-binding that
    * handles the click event when a results entry is clicked. This method also
    * stores the element associated with the binding for later use in selecting /
    * deselecting entries
    * @param {object} elem - the element associated with the KnockOut data-binding
    * that calls this function
    * @param {object} entry - a single result as returned from GMaps nearbySearch
    * that is also associated with the KnockOut data-binding that calls this function
    */
    function assignEntryClick(elem, entry) {
        entry.element = elem; // store the associated element on its own entry
        return entryClick;
    }

    /**
    * @description When a results entry is clicked, this will either select the
    * entry or open the entry, if it has been selected. This will allow a mobile
    * device that has no MouseOver event to be able to highlight an entry and its
    * associated map marker
    * @param {object} entry - a single result as returned from GMaps nearbySearch
    */
    function entryClick(entry) {
        if (selectedEntry && selectedEntry.place_id === entry.place_id){
            openEntry(entry);
            console.log('openEntry()');
        }
        else {
            selectEntry(entry);
        }
    }

    /**
    * @description Selects / highlights the results entry as the mouse moves over it
    * @param {object} entry - a single result as returned from GMaps nearbySearch
    */
    function entryMouseOver(entry) {
        selectEntry(entry);
    }

    /**
    * @description When a map marker is clicked, this will select the associated
    * entry and open it for viewing
    * @param {object} entry - a single result as returned from GMaps nearbySearch
    */
    function markerClick(entry) {
        return function (){
            selectEntry(entry);
            openEntry(entry);
            console.log('openEntry()');
        };
    }

    /**
    * @description Select the provided entry by adding the 'active' class to the
    * results list entry and by highlighting the map marker
    * @param {object} entry - a single result as returned from GMaps nearbySearch
    */
    function selectEntry(entry){
        if (selectedEntry){
            var icon = createMarkerIcon(MARKER_COLOR);
            selectedEntry.marker.setIcon(icon);
            selectedEntry.marker.setZIndex(google.maps.Marker.MAX_ZINDEX-1);
            $(selectedEntry.element).toggleClass('active', false);
        }

        selectedEntry = entry;
        var selectedIcon = createMarkerIcon(SELECTED_MARKER_COLOR);
        selectedEntry.marker.setIcon(selectedIcon);
        selectedEntry.marker.setZIndex(google.maps.Marker.MAX_ZINDEX+1);
        $(selectedEntry.element).toggleClass('active', true);
    }

// -----------------------------------------------------------------------------

// =============================================================================

    function openEntry(entry) {
        $entryView.css('visibility', 'visible');
    }

    function closeEntry() {
        $entryView.css('visibility', 'hidden');
    }

    function openWelcome() {
        $welcomeClose.css('display', 'block');
        $welcomeView.css('visibility', 'visible');
    }

    function closeWelcome(){
        $welcomeView.css('visibility', 'hidden');
    }

// -----------------------------------------------------------------------------

// =============================================================================

    /**
    * @description Called when user clicks the filter button in the results view;
    * this will progressively filter the search results by whatever the user enters
    */
    function filterClick() {
        // don't do anything if the user didn't enter anything to filter by
        if (!t.filterQuery()) return;

        // update the label showing the current filter
        if (t.filterLabel() == NO_FILTER_MSG){
            t.filterLabel(t.filterQuery());
        }
        else{
            t.filterLabel(t.filterLabel()+ ' + ' +t.filterQuery());
        }

        // Save the filterQuery and then clear it from the display
        var tmpQuery = t.filterQuery();
        t.filterQuery('');

        toggleMarkers(false);   // turn off all displayed markers

        var filteredResults = t.results().filter(checkFilterQuery(tmpQuery));
        t.results(filteredResults);

        toggleMarkers(true); // turn on markers for the newly filtered results
    }

    /**
    * @description Called when user clicks the 'X' next to the filter label;
    * resets the search results to the original query results
    */
    function clearFilterClick() {
        if (t.results() === originalResults) return;

        toggleMarkers(false);

        t.results(originalResults);

        toggleMarkers(true);
        t.filterLabel(NO_FILTER_MSG);
    }

    /**
    * @description This is used in conjunction with results.filter() as called
    * by filterClick and servers as a comparison function to know which array
    * entries should be filtered
    * @param {string} query - text by which the search results will be filtered
    * @return {boolean} true - a query match was found; false - no match found
    */
    function checkFilterQuery(query){
        return function(entry, index){
            var key = query.toLowerCase();
            var name = entry.name.toLowerCase();
            var address = entry.vicinity.toLowerCase();

            if (name.includes(key) || address.includes(key))
                return true;
            else
                return false;
        };
    }

    /**
    * @description Use to display or hide the markers on the map; used
    * by filterClick() to remove old search results from the map and display the
    * new results
    * @param {boolean} display - true to display markers; false to remove markers
    */
    function toggleMarkers(display){
        var tmpMap = null;
        if (display){
            tmpMap = map;
        }

        var len = t.results().length;
        var item = {};
        for (var i=0; i<len; i++){
            item = t.results()[i];
            item.marker.setMap(tmpMap);
        }
    }

// -----------------------------------------------------------------------------


    function serviceClick(btnElem, loader) {
        return function(){
            selectActiveButton(btnElem);
            loader();
        };
    }

    function selectActiveButton(btnElem) {
        $selectServiceView.children('button').toggleClass('btn-primary', false);
        $selectServiceView.children('button').toggleClass('btn-default', true);
        $(btnElem).toggleClass('btn-primary', true);
        $(btnElem).toggleClass('btn-default', false);
    }

    function gpLoader() {
        console.log('google');
    }


    function ypLoader() {
        console.log('yellow pages');
    }






    /**
    * @description Initializes Googles Maps related services for use in this app;
    * this is run when the script is loaded by the browser.
    */
    function initializeGMaps() {
        map = new google.maps.Map(document.getElementById('map'), {
                center: DEFUALT_MAP_CENTER,
                zoom: 11,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                    position: google.maps.ControlPosition.TOP_RIGHT
                },
                streetViewControl: false,
                scaleControl: true
        });
        geocoder = new google.maps.Geocoder();
        places = new google.maps.places.PlacesService(map);
    }

    initializeGMaps();
}



var myViewModel = new AppViewModel();
ko.applyBindings(myViewModel);
