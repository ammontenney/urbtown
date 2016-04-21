var DEFUALT_MAP_CENTER = { lat: 37.2739675, lng: -104.678212}; // center of the USA
var RADIUS_PRESETS = [5,10,15,20,25];

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
    var results;

    var $welcomeView = $('.welcome-view');
    var $welcomeError = $('.welcome-error');
    var $loadingNotification = $('.welcome-loading');

    t.RADIUS_PRESETS = ko.observableArray(RADIUS_PRESETS);

    t.query = ko.observable();
    t.address = ko.observable();
    t.radius = ko.observable();

    t.welcomeSubmit = welcomeSubmit;

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

            results = placesResults;

            // TODO: modify map view: logo, map type, results view, search button
            // TODO: populate results view
            // TODO: populate map markers

            $loadingNotification.css('visibility', 'hidden');
            $welcomeView.css('visibility', 'hidden');
        }


    }

    /**
    * @description Initializes Googles Maps related services for use in this app;
    * this is run when the script is loaded by the browser.
    */
    function initializeGMaps() {
        map = new google.maps.Map(document.getElementById('map'), {
                center: DEFUALT_MAP_CENTER,
                zoom: 13
        });
        geocoder = new google.maps.Geocoder();
        places = new google.maps.places.PlacesService(map);
    }

    initializeGMaps();
}



var myViewModel = new AppViewModel();
ko.applyBindings(myViewModel);
