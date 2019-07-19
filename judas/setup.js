/* global d3, crossfilter, barChart, points */
var map;
var markers = [];
var polylines = [];
let currentFilters = [];

var values;

var usrDimension;
var val1Dimension;
var val1Grouping;

var charts;
var domCharts;

var latDimension;
var lngDimension;
var idDimension;
var idGrouping;
var all;
var checkedPersons = []

function init() {
    initMap();
    initCrossfilter();

    // bind map bounds to lat/lng filter dimensions
    latDimension = values.dimension(function (p) {
        return p.lat;
    });

    lngDimension = values.dimension(function (p) {
        return p.lng;
    });

    usrDimension = values.dimension(function (d) {
        return d.usr
    });

    google.maps.event.addListener(map, "bounds_changed", function () {
        var bounds = this.getBounds();
        var northEast = bounds.getNorthEast();
        var southWest = bounds.getSouthWest();

        // NOTE: need to be careful with the dateline here
        lngDimension.filterRange([southWest.lng(), northEast.lng()]);
        latDimension.filterRange([southWest.lat(), northEast.lat()]);

    });

    // dimension and group for looking up currently selected markers
    idDimension = values.dimension(function (p, i) {
        return i;
    });
    idGrouping = idDimension.group(function (id) {
        return id;
    });

    renderAll();
}

function initMap() {
    google.maps.visualRefresh = true;

    var bounds = new google.maps.LatLngBounds();
    for (point of points) {
        bounds.extend(new google.maps.LatLng(point.lat, point.lng));
    }

    var initialLatlng = new google.maps.LatLng(38.1, -96.24);
    var mapOptions = {
        zoom: 4,
        center: initialLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: false,
        panControl: false
    };

    map = new google.maps.Map(document.getElementById("map-div"), mapOptions);
    map.fitBounds(bounds);
    var color;
    for (var i = 0; i < points.length - 1; i++) {
        if (points[i + 1] === undefined || points[i + 1].id === 0) {
            color = "transparent";
        } else {
            if (points[i].usr === "pg") {
                color = "#e6194B";
            } else if (points[i].usr === "tg") {
                color = "#3cb44b"
            } else if (points[i].usr === "vt") {
                color = "#42d4f4"
            } else if (points[i].usr === "fj") {
                color = "#000000"
            }
            else if (points[i].usr === "om") {
                color = "#FF1493"
            }
        }

        polylines[i] = new google.maps.Polyline({
            path: [{
                lat: points[i].lat,
                lng: points[i].lng
            }, {
                lat: points[i + 1].lat,
                lng: points[i + 1].lng
            }],
            strokeColor: color,
            // strokeOpacity: 1.0,
            strokeWeight: 3,
            map: map
        });
    }
}

function initCrossfilter() {
    values = crossfilter(points);
    all = values.groupAll();
}

// Renders the specified chart
function render(method) {
    d3.select(this).call(method);
}

// set visibility of markers based on crossfilter
function updateMarkers() {}

function updatePolylines() {
    var pointIds = idGrouping.all();
    for (var i = 0; i < pointIds.length - 1; i++) {
        var pointId = pointIds[i];
        polylines[pointId.key].setVisible(pointId.value > 0);
    }
}

// Whenever the brush moves, re-render charts and map markers
function renderAll() {

    if (checkedPersons.length === 0) {
        usrDimension.filterAll();
    }
    else {
        usrDimension.filter(d => {
            if (checkedPersons.length === 1) {
                return d !== checkedPersons[0]
            }
            if (checkedPersons.length === 2) {
                return d !== checkedPersons[0] && d !== checkedPersons[1]
            }
            if (checkedPersons.length === 3) {
                return d !== checkedPersons[0] && d !== checkedPersons[1] && d !== checkedPersons[2]
            }
            if (checkedPersons.length === 4) {
                return d !== checkedPersons[0] && d !== checkedPersons[1] && d !== checkedPersons[2] && d !== checkedPersons[3]
            }
        })
    }

    usrDimension.groupAll()
    updateMarkers();
    updatePolylines();
}


document.getElementById("valdi").addEventListener("change", function () {
    if (!this.checked) {
        checkedPersons.push("tg")
    } else {
        checkedPersons = checkedPersons.filter(item => {
            return item !== "tg"
        })
    }
    renderAll();
});

document.getElementById("oli").addEventListener("change", function () {
    if (!this.checked) {
        checkedPersons.push("om")
    } else {
        checkedPersons = checkedPersons.filter(item => {
            return item !== "om"
        })
    }
    renderAll();
});

document.getElementById("vidar").addEventListener("change", function () {
    if (!this.checked) {
        checkedPersons.push("vt")
    } else {
        checkedPersons = checkedPersons.filter(item => {
            return item !== "vt"
        })
    }
    renderAll();
});

document.getElementById("frosti").addEventListener("change", function () {
    if (!this.checked) {
        checkedPersons.push("fj")
    } else {
        checkedPersons = checkedPersons.filter(item => {
            return item !== "fj"
        })
    }
    renderAll();
});

// Reset a particular histogram
window.reset = function (i) {
    // charts[i].filter(null);
    renderAll();
};