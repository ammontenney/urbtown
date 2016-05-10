var DEFUALT_MAP_CENTER = {lat: 37.2739675, lng: -104.678212}; // center of the USA
var RADIUS_PRESETS = [5,10,15,20,25];
var SELECTED_MARKER_COLOR = 'lightblue';
var MARKER_COLOR = 'red';
var NO_FILTER_MSG = 'No filter applied.';
var GP_LOGO = 'img/g-logo.png';
var YP_LOGO = 'img/yp-logo.svg';

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
    var selectedLoader = gpLoader;

    // Some jQuery handles for commonly used elements
    var $welcomeView = $('.welcome-view');
    var $welcomeError = $('.welcome-error');
    var $loadingNotification = $('.welcome-loading');
    var $results = $('.results');
    var $arrow = $('.arrow');
    var $entryView = $('.entry-view');
    var $welcomeClose = $('.welcome-close');
    var $selectServiceView = $('.select-service-view');

    t.RADIUS_PRESETS = ko.observableArray(RADIUS_PRESETS);

    // KnockOut observables used in index.html
    t.query = ko.observable();
    t.address = ko.observable();
    t.radius = ko.observable();
    t.results = ko.observableArray();
    t.filterQuery = ko.observable();
    t.filterLabel = ko.observable(NO_FILTER_MSG);
    t.showLoaderContent = ko.observable(false); // T/F
    t.showLoaderMsg = ko.observable(false); // T/F
    t.loaderMsgTitle = ko.observable();
    t.loaderMsgDesc = ko.observable();
    t.showEntryView = ko.observable(false); // T/F
    t.loaderLogo = ko.observable();
    t.loaderInfo = ko.observableArray();
    t.loaderReviews = ko.observableArray();
    t.entryName = ko.observable();

    t.styleShowLoaderContent = ko.pureComputed(styleShowLoaderContent);
    t.styleShowLoaderMsg = ko.pureComputed(styleShowLoaderMsg);
    t.styleShowEntryView = ko.pureComputed(styleShowEntryView);



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
    t.serviceBtnClick = serviceBtnClick;
    t.gpLoader = gpLoader;
    t.ypLoader = ypLoader;


    // =========================================================================
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
    // -------------------------------------------------------------------------


    // =========================================================================
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
    // -------------------------------------------------------------------------


    // =========================================================================
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
    // -------------------------------------------------------------------------


    // =========================================================================
    /**
    * @description This is called by a results-list click or a map marker click
    * and opens the entry-view to view 3rd party info for the selectedEntry
    */
    function openEntry() {
        t.showEntryView(true);
        selectedLoader();
    }

    /**
    * @description Sets the title and description on the loader-msg view
    * @param {string} title
    * @param {string} desc
    */
    function setLoaderMsg(title, desc) {
        t.loaderMsgTitle(title);
        t.loaderMsgDesc(desc);
    }

    /**
    * @description Hide the entry-view from the display
    */
    function closeEntry() {
        toggleLoaderMsg(false, false);
        t.showEntryView(false);
    }

    /**
    * @description Called when the user clicks the magnifying glass icon to
    * change the map location
    */
    function openWelcome() {
        // TODO: replace w/ observables
        t.filterLabel(NO_FILTER_MSG);
        $welcomeClose.css('display', 'block');
        $welcomeView.css('visibility', 'visible');
    }

    /**
    * @description Called when when the user clicks the X icon in the corner of
    * the welcome view
    */
    function closeWelcome(){
        // TODO: replace w/ observables
        $welcomeView.css('visibility', 'hidden');
    }
    // -------------------------------------------------------------------------


    // =========================================================================
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
    // -------------------------------------------------------------------------


    // =========================================================================
    function styleShowLoaderContent() {
        if (t.showLoaderContent())
            return 'visible';
        else
            return 'hidden';
    }

    function styleShowLoaderMsg() {
        if (t.showLoaderMsg())
            return 'visible';
        else
            return 'hidden';
    }

    function toggleLoaderMsg(msgOpen, contentOpen) {
        t.showLoaderMsg(msgOpen);
        if (contentOpen === undefined)
            t.showLoaderContent(!msgOpen);
        else
            t.showLoaderContent(contentOpen);
    }


    function styleShowEntryView() {
        if (t.showEntryView())
            return 'visible';
        else
            return 'hidden';
    }
    // -------------------------------------------------------------------------


    /**
    * @description Called when the user selects which 3rd party service they
    * want to seen info for. Associates the appropriate element (for selecting/
    * deselecting) and loading function to each button via KnockOut
    * @param {obj} btnElem - the element representing the button that the user
    * just clicked
    * @param {function} loader - the function that will load 3rd party info from
    * its related service and display it to the entry-view
    */
    function serviceBtnClick(btnElem, loader) {
        return function(){
            selectActiveButton(btnElem);
            selectedLoader = loader;
            loader();
        };
    }

    /**
    * @description Highlights the provided button element and deselects all others
    * @param {obj} btnElem - the buton to be highlighted
    */
    function selectActiveButton(btnElem) {
        $selectServiceView.children('button').toggleClass('btn-primary', false);
        $selectServiceView.children('button').toggleClass('btn-default', true);
        $(btnElem).toggleClass('btn-primary', true);
        $(btnElem).toggleClass('btn-default', false);
    }

    /**
    * @description loads review info from Google Places Reviews
    */
    function gpLoader() {
        // clear any old results from the views
        t.loaderInfo([]);
        t.loaderReviews([]);

        setLoaderMsg('Loading ...', '');
        t.loaderLogo(GP_LOGO);
        toggleLoaderMsg(true);

        var request = {placeId: selectedEntry.place_id};
        places.getDetails(request, gpLoaderCallback);
    }

    /**
    * @description this method is called once Google places.getDetails request is
    * completed. The details returned are then displayed to loader-reviews
    * @param {object} details - the results returned from Google Places
    * @param {object} status - lets us know if the request to Google Places
    *  request was successful or not
    */
    function gpLoaderCallback(details, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK){
            setLoaderMsg('Something didn\'t work. Try again.', 'Error: '+ status);
            toggleLoaderMsg(true);
            return;
        }

        t.entryName(details.name);

        // Display the location details to the loader-info view
        var tmpInfo = [];
        // tmpInfo.push({title: 'Name:', desc: details.name || '-'});
        tmpInfo.push({title: 'Avg Rating:', desc: details.rating || '-'});
        tmpInfo.push({title: 'Phone:', desc: details.formatted_phone_number || '-'});
        if (details.website){
            var website = '<a target="_blank" href="'+details.website+'">Click to open</a>';
            tmpInfo.push({title: 'Website:', desc: website});
        }
        if (details.formatted_address) {
            var address = '<a target="_blank" href="'+details.url+'">'+details.formatted_address+'</a>';
            tmpInfo.push({title: 'Address:', desc: address});
        }
        t.loaderInfo(tmpInfo);

        // Display the location reviews to the loader-reviews view
        var tmpReviews = [];
        if (!details.reviews){

            tmpReviews.push({
                author_name: 'No reviews',
                rating: '',
                text: ''
            });

            t.loaderReviews(tmpReviews);
            toggleLoaderMsg(false);
            return;
        }

        t.loaderReviews(details.reviews);
        toggleLoaderMsg(false);
    }




    /**
    * @description loads reviews from YP.com (YellowPages). This is done in 2
    * callbacks as shown below
    */
    function ypLoader() {
        // clear any old results from the view
        t.loaderInfo([]);
        t.loaderReviews([]);

        // display a loading message
        setLoaderMsg('Loading ...', '');
        toggleLoaderMsg(true);
        t.loaderLogo(YP_LOGO);

        // var listing;
        // var reviews;


        // Request location details from YP.com
        var timeout = setTimeout(timeoutError, 6000);
        var loc = selectedEntry.geometry.location.lat() + ':' + selectedEntry.geometry.location.lng();
        $.ajax({
            url: 'http://api2.yp.com/listings/v1/search',
            dataType: 'jsonp',
            data: { key: 'qw1921yj10',
                    term: selectedEntry.name,
                    format: 'json',
                    listingcount: '5',
                    searchloc: loc},
            success: ypLoaderCallback1
        });


        /*
        * @description used to notify the user the YP.com request failed because
        * jsonp does not support fail methods apparently
        */
        function timeoutError(){
            setLoaderMsg('Something didn\'t work. Try again.', 'Error: request timed out');
            toggleLoaderMsg(true);
            return;
        }

        /*
        * @description callback1 gets location details for the selected entry
        * which includes a listingid that is required to lookup reviews for the
        * YP.com listing
        * @param {data} - the results from yp.com search api
        */
        function ypLoaderCallback1(data) {
            clearTimeout(timeout);

            if (data.searchResult.metaProperties.listingCount === 0) {
                setLoaderMsg('No results', 'YP.com did not return any info for this location.');
                toggleLoaderMsg(true);
                return;
            }

            // TODO: the listing at index 0 is not always the same listing, check
            // the name as well for a match
            var listing = data.searchResult.searchListings.searchListing[0];

            t.entryName(listing.businessName);

            // Update the loader-info view
            var tmpInfo = [];
            // tmpInfo.push({title: 'Name:', desc: listing.businessName || '-'});
            tmpInfo.push({title: 'Avg Rating:', desc: listing.averageRating || '-'});
            tmpInfo.push({title: 'Phone:', desc: listing.phone});
            if (listing.websiteURL){
                var website = '<a target="_blank" href="'+listing.websiteURL+'">Click to open</a>';
                tmpInfo.push({title: 'Website:', desc: website});
            }
            var address = listing.street + ', ' +
                       listing.city + ', ' +
                       listing.state + ' ' + listing.zip;
            tmpInfo.push({title: 'Address:', desc: address});

            t.loaderInfo(tmpInfo);

            timeout = setTimeout(timeoutError, 6000);

            // Request the Review data from YP.com
            $.ajax({
                url: 'http://api2.yp.com/listings/v1/reviews',
                dataType: 'jsonp',
                data: { key: 'qw1921yj10',
                        format: 'json',
                        listingid: listing.listingId},
                success: ypLoaderCallback2
            });

            toggleLoaderMsg(false);
        }

        /*
        * @description this retrieves the reviews for the YP.com listing that
        * was returned in callback1
        * @param {object} data - the reviews results from YP.com
        */
        function ypLoaderCallback2(data) {
            clearTimeout(timeout);

            var tmpReviews = [];

            if (data.ratingsAndReviewsResult.metaProperties.reviewCount === 0){
                tmpReviews.push({
                    author_name: 'No reviews',
                    rating: '',
                    text: ''
                });
                t.loaderReviews(tmpReviews);
                return;
            }

            tmpReviews = data.ratingsAndReviewsResult.reviews.review;

            // Add the properties to the reviews results that the view will look
            // for to display to the user
            var review;
            for (var i=0; i<tmpReviews.length; i++){
                review = tmpReviews[i];
                review.author_name = review.reviewer;
                review.text = review.reviewSubject + ': ' + review.reviewBody;
            }
            t.loaderReviews(tmpReviews);
        }
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

// TODO: change global to var
myViewModel = new AppViewModel();
ko.applyBindings(myViewModel);
