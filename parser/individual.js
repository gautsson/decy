const convert = require("xml-js");
const fs = require("fs");

let oldDirectory = "pallitcx";
let newDirectory = "./" + oldDirectory + "_new/";

let pts = [];
var distanceOffset = 0;

function processFile(goodies) {
    let id = 0;
    let currentDistance = 0;
    goodies.forEach(goodie => {
        if (goodie.Position) {
            let time = goodie.Time._text;
            let lat = Number(goodie.Position.LatitudeDegrees._text);
            let lng = Number(goodie.Position.LongitudeDegrees._text);
            let elev = goodie.AltitudeMeters ? Number(goodie.AltitudeMeters._text) : 0;
            currentDistance = distanceOffset + (Number(goodie.DistanceMeters._text)/1000)
            // console.log(currentDistance)
            let pwr = 0;
            let speed = 0;
            if (goodie.Extensions["ns3:TPX"]) {
                speed = goodie.Extensions["ns3:TPX"]["ns3:Speed"] ? Number(goodie.Extensions["ns3:TPX"]["ns3:Speed"]._text) * 3.6 : 0;
                pwr = goodie.Extensions["ns3:TPX"]["ns3:Watts"] ? Number(goodie.Extensions["ns3:TPX"]["ns3:Watts"]._text) : 0;
            }
            else if (goodie.Extensions.TPX) {
                speed = goodie.Extensions.TPX.Speed ? Number(goodie.Extensions.TPX.Speed._text) * 3.6 : 0;
            }
            speed = speed.toFixed(2)
            lat = lat.toFixed(6)
            lng = lng.toFixed(6)
            let cad = goodie.Cadence ? Number(goodie.Cadence._text) : 0;
            let hr = goodie.HeartRateBpm ? Number(goodie.HeartRateBpm.Value._text) : 0;
    
            let newObj =  {id: id, elev: elev, speed: speed, lat: lat, lng: lng, cad: cad, heart_rate: hr, time: time, dist: currentDistance}
            if (goodie.Extensions["ns3:TPX"] && goodie.Extensions["ns3:TPX"]["ns3:Watts"]) {
                newObj.pwr = pwr;
            }
 
            pts.push(newObj);
            id += 1;
        }
    })
    distanceOffset = currentDistance;
}



if (!fs.existsSync(newDirectory)) {
    fs.mkdirSync(newDirectory);
}

let filenames = fs.readdirSync("./" + oldDirectory);
console.log(filenames)

filenames.forEach((filename, idx) => {
    idx += 1;
    console.log(idx)
    let data = fs.readFileSync("./" + oldDirectory + "/" + filename);
    let result = convert.xml2json(data, {
        compact: true,
        spaces: 4
    });

    let activity = JSON.parse(result).TrainingCenterDatabase.Activities.Activity;
    let goodies = "";
    if (Array.isArray(activity.Lap)) {
        activity.Lap.forEach((lap) => {
            // goodies = lap.Track.Trackpoint
            processFile(lap.Track.Trackpoint)
        })
    } else {
        // goodies = activity.Lap.Track.Trackpoint
        processFile(activity.Lap.Track.Trackpoint)
    }

})
fs.writeFileSync(newDirectory + oldDirectory + "All.js", "var points = " + JSON.stringify(pts));
console.log("\nDone with " + oldDirectory)