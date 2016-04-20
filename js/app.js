var DEFUALT_MAP_CENTER = { lat: 37.2739675, lng: -104.678212}; // center of the USA

/**
* @description This is the ViewModel to use with KnockOut.js. This whole app
* pretty much revolves around this class
* @constructor
*/
function AppViewModel() {
    var t = this;

    var map;

    /**
    * @description Initializes Googles Maps related services for use in this app;
    * this is run when the script is loaded by the browser
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
