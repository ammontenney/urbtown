var DEFUALT_MAP_CENTER = { lat: 37.2739675, lng: -104.678212}; // center of the USA

var map;

/*
    @description    This is run when the script is loaded by the browser
                    It initilized Googles Maps related services for use in
                    this app
*/
function initializeGMaps(){
    map = new google.maps.Map(document.getElementById('map'), {
            center: DEFUALT_MAP_CENTER,
            zoom: 13
    });
}

initializeGMaps();
