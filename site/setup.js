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

        // NOTE: may want to debounce here, perhaps on requestAnimationFrame
        updateCharts();
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
                color = "red";
            } else if (points[i].usr === "thg") {
                color = "blue"
            }
            else if (points[i].usr === "vt") {
                color = "yellow"
            }
            else if (points[i].usr === "fj") {
                color = "green"
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
    // console.log(filter.groupAll().reduceCount().value())
    all = values.groupAll();
    // simple dimensions and groupings for major variables
    val1Dimension = values.dimension(
        function (p) {
            return p.speed;
        });
    val1Grouping = val1Dimension.group(
        function (v) {
            // return Math.floor(v);
            return Math.round(v * 10) / 10;
            // return v;
        });

    var

        // initialize charts (helper function in chart.js)
        // taken directly from crossfilter's example
        charts = [
            barChart()
            .dimension(val1Dimension)
            .group(val1Grouping)
            .x(d3.scale.linear()
                .domain([0, 100])
                .rangeRound([0, 40 * 26]))
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

    // let avgSpd = Number(all.reduceSum(function (fact) {
    //     return fact.speed;
    // }).value() / all.reduceCount().value()).toFixed(0);
    // let avgHr = Number(all.reduceSum(function (fact) {
    //     return fact.heart_rate;
    // }).value() / all.reduceCount().value()).toFixed(0);
    // let avgCad = Number(all.reduceSum(function (fact) {
    //     return fact.cad;
    // }).value() / all.reduceCount().value()).toFixed(0);
    // let avgElev = Number(all.reduceSum(function (fact) {
    //     return fact.elev;
    // }).value() / all.reduceCount().value()).toFixed(0);
    // let avgPwr = Number(all.reduceSum(function (fact) {
    //     return fact.pwr;
    // }).value() / all.reduceCount().value()).toFixed(0);
    // // let avg
    // if (avgSpd !== NaN) {
    //     d3.select("#avgSpd").text("Meðaltal: " + avgSpd + " km/h");
    // }
    // if (avgHr !== NaN) {
    //     d3.select("#avgHr").text("Meðaltal: " + avgHr + " slög/min");
    // }
    // if (avgCad !== NaN) {
    //     d3.select("#avgCad").text("Meðaltal: " + avgCad + " snúningar / min");
    // }
    // if (avgElev !== NaN) {
    //     d3.select("#avgElev").text("Meðaltal: " + avgElev + " metrar yfir sjávarmáli");
    // }
    // if (avgPwr !== NaN) {
    //     d3.select("#avgPwr").text("Meðaltal: " + avgPwr + " W");
    // }

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


document.getElementById("palli").addEventListener('change', function () {
    if (!this.checked) {
        usrDimension.filter("pg").groupAll()
    } else {
        usrDimension.filter("thg").groupAll()
    }
    renderAll();
});

document.getElementById("valdi").addEventListener('change', function () {
    if (!this.checked) {
        usrDimension.filter("thg").groupAll()
    } else {
        usrDimension.filterAll().groupAll()
    }
    renderAll();
});



// Reset a particular histogram
window.reset = function (i) {
    charts[i].filter(null);
    renderAll();
};