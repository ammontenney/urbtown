var DEFUALT_MAP_CENTER = {lat: 37.2739675, lng: -104.678212}; // center of the USA
var RADIUS_PRESETS = [5,10,15,20,25];
var SELECTED_MARKER_COLOR = 'green';
var MARKER_COLOR = 'red';

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

    var coords = DEFUALT_MAP_CENTER;
    // var results;

    var resultsToggleState = false;

    var $welcomeView = $('.welcome-view');
    var $welcomeError = $('.welcome-error');
    var $loadingNotification = $('.welcome-loading');
    var $results = $('.results');
    var $arrow = $('.arrow');

    t.RADIUS_PRESETS = ko.observableArray(RADIUS_PRESETS);

    t.query = ko.observable();
    t.address = ko.observable();
    t.radius = ko.observable();
    t.results = ko.observableArray();

    t.welcomeSubmit = welcomeSubmit;
    t.arrowClick = arrowClick;

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
    * @return true - user input is valid; welcomeError is hidden
    * @return false - user input is not valid; welcomeError is displayed
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

            t.results(placesResults);
            console.log(placesResults);

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
            // google.maps.event.addListener(entry.marker, 'click', markerClick(item));
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

    function resetMap() {

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
