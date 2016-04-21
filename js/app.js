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

    var $welcomeError = $('.welcome-error');

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
        console.log('load notification, lookup coords');
        // TODO: display/hide loading notification
        // TODO: lookup address coords
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
    * @description Initializes Googles Maps related services for use in this app;
    * this is run when the script is loaded by the browser.
    */
    function initializeGMaps() {
        map = new google.maps.Map(document.getElementById('map'), {
                center: DEFUALT_MAP_CENTER,
                zoom: 13
        });
    }

    initializeGMaps();
}






var myViewModel = new AppViewModel();
ko.applyBindings(myViewModel);
