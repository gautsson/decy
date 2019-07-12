/* global d3, crossfilter, barChart, points */
var map;
var markers = [];
var polylines = [];

var filter;
var val1Dimension;
var val1Grouping;
var val2Dimension;
var val2Grouping;
var charts;
var domCharts;

var latDimension;
var lngDimension;
var idDimension;
var idGrouping;
var all;

function init() {
    initMap();
    initCrossfilter();

    // bind map bounds to lat/lng filter dimensions
    latDimension = filter.dimension(function (p) {
        return p.lat;
    });

    lngDimension = filter.dimension(function (p) {
        return p.lng;
    });

    google.maps.event.addListener(map, 'bounds_changed', function () {
        var bounds = this.getBounds();
        var northEast = bounds.getNorthEast();
        var southWest = bounds.getSouthWest();

        // NOTE: need to be careful with the dateline here
        lngDimension.filterRange([southWest.lng(), northEast.lng()]);
        latDimension.filterRange([southWest.lat(), northEast.lat()]);

        // NOTE: may want to debounce here, perhaps on requestAnimationFrame
        updateCharts();
    });

    // dimension and group for looking up currently selected markers
    idDimension = filter.dimension(function (p, i) {
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

    for (var i = 0; i < points.length - 1; i++) {
        var color = "red";
        if (points[i + 1] === undefined || points[i + 1].id === 0) {
            color = "transparent";
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
    filter = crossfilter(points);
    // console.log(filter.groupAll().reduceCount().value())
    all = filter.groupAll();

    // simple dimensions and groupings for major variables
    val1Dimension = filter.dimension(
        function (p) {
            return p.speed;
        });
    val1Grouping = val1Dimension.group(
        function (v) {
            return Math.round(v);
            // return Math.round(v * 10) / 10;
            // return Math.floor(v / 25) * 25;
            return v;
        });

    val2Dimension = filter.dimension(
        function (p) {
            return p.heart_rate;
        });
    val2Grouping = val2Dimension.group(
        function (v) {
            return v;
        });

    val3Dimension = filter.dimension(
        function (p) {
            return p.cad;
        });
    val3Grouping = val3Dimension.group(
        function (v) {
            return v;

        });

    val4Dimension = filter.dimension(
        function (p) {
            return p.elev;
        });
    val4Grouping = val4Dimension.group(
        function (v) {
            return v;
            // return Math.floor(v / 5) * 5;
        });

    // initialize charts (helper function in chart.js)
    // taken directly from crossfilter's example
    charts = [
        barChart()
        .dimension(val1Dimension)
        .group(val1Grouping)
        .x(d3.scale.linear()
            .domain([0, 100])
            .rangeRound([0, 40 * 26])),

        barChart()
        .dimension(val2Dimension)
        .group(val2Grouping)
        .x(d3.scale.linear()
            .domain([50, 200])
            .rangeRound([0, 40 * 26])),
        // .filter([150, 200]),

        barChart()
        .dimension(val3Dimension)
        .group(val3Grouping)
        .x(d3.scale.linear()
            .domain([0, 140])
            .rangeRound([0, 40 * 26])),

        barChart()
        .dimension(val4Dimension)
        .group(val4Grouping)
        .x(d3.scale.linear()
            .domain([-50, 800])
            .rangeRound([0, 40 * 26])),
    ];

    // bind charts to dom
    domCharts = d3.selectAll(".chart")
        .data(charts)
        .each(function (chart) {
            chart.on("brush", renderAll).on("brushend", renderAll);
        });

}

// Renders the specified chart
function render(method) {
    d3.select(this).call(method);
}

// Renders all of the charts
function updateCharts() {
    domCharts.each(render);

    let avgSpd = Number(all.reduceSum(function (fact) {
        return fact.speed;
    }).value() / all.reduceCount().value()).toFixed(0);
    let avgHr = Number(all.reduceSum(function (fact) {
        return fact.heart_rate;
    }).value() / all.reduceCount().value()).toFixed(0);
    let avgCad = Number(all.reduceSum(function (fact) {
        return fact.cad;
    }).value() / all.reduceCount().value()).toFixed(0);
    let avgElev = Number(all.reduceSum(function (fact) {
        return fact.elev;
    }).value() / all.reduceCount().value()).toFixed(0);
    
    if (!isNaN(avgSpd)) {
        d3.select("#avgSpd").text("Meðaltal: " + avgSpd + " km/h");
    }
    if (!isNaN(avgHr)) {
        d3.select("#avgHr").text("Meðaltal: " + avgHr + " slög/min");
    }
    if (!isNaN(avgCad)) {
        d3.select("#avgCad").text("Meðaltal: " + avgCad + " snúningar / min");
    }
    if (!isNaN(avgElev)) {
        d3.select("#avgElev").text("Meðaltal: " + avgElev + " metrar yfir sjávarmáli");
    }
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
    updateMarkers();
    updatePolylines();
    updateCharts();
}

// Reset a particular histogram
window.reset = function (i) {
    charts[i].filter(null);
    renderAll();
};