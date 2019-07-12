const convert = require("xml-js");
const fs = require("fs");

function start() {
    let prefix = "data"
    let dirs = ["vt", "tg", "pg", "fj"];

    dirs.forEach(dir => {
        processPerson(prefix + "/" + dir);
    })
}

function processFileInMemory(goodies) {
    let pts = [];
    let id = 0;

    goodies.forEach(goodie => {
        if (goodie.Position) {
            let time = goodie.Time._text;
            let lat = Number(goodie.Position.LatitudeDegrees._text);
            let lng = Number(goodie.Position.LongitudeDegrees._text);
            let elev = goodie.AltitudeMeters ? Number(goodie.AltitudeMeters._text) : 0;
            let pwr = 0;
            let speed = 0;
            if (goodie.Extensions["ns3:TPX"]) {
                speed = goodie.Extensions["ns3:TPX"]["ns3:Speed"] ? Number(goodie.Extensions["ns3:TPX"]["ns3:Speed"]._text) * 3.6 : 0;
                pwr = goodie.Extensions["ns3:TPX"]["ns3:Watts"] ? Number(goodie.Extensions["ns3:TPX"]["ns3:Watts"]._text) : 0;
            }
            else if (goodie.Extensions.TPX) {
                speed = goodie.Extensions.TPX.Speed ? Number(goodie.Extensions.TPX.Speed._text) * 3.6 : 0;
            }
            let cad = goodie.Cadence ? Number(goodie.Cadence._text) : 0;
            let hr = goodie.HeartRateBpm ? Number(goodie.HeartRateBpm.Value._text) : 0;
    
            let newObj =  {id: id, elev: elev, speed: speed, lat: lat, lng: lng, cad: cad, heart_rate: hr, time: time }
            if (goodie.Extensions["ns3:TPX"] && goodie.Extensions["ns3:TPX"]["ns3:Watts"]) {
                newObj.pwr = pwr;
            }
 
            pts.push(newObj);
            id += 1;
        }
    })
    return pts;
}

function processPerson(person) {
    console.log("Starting with: " + person)
    // initialize values for person
    let pts = [];
    let distance = 0;
    let time = 0;

    // get all files for person
    let filenames = fs.readdirSync("./" + person);

    filenames.forEach((filename, idx) => {
        idx += 1;
        let currentPoints = [];
        // console.log("Processing file: " + idx)

        let data = fs.readFileSync("./" + person + "/" + filename);
        let result = convert.xml2json(data, {
            compact: true,
            spaces: 4
        });

        let activity = JSON.parse(result).TrainingCenterDatabase.Activities.Activity;
        if (Array.isArray(activity.Lap)) {
            activity.Lap.forEach((lap) => {
                let newPoints = processFileInMemory(lap.Track.Trackpoint)
                currentPoints = currentPoints.concat(newPoints)
                distance = distance + Number(lap.DistanceMeters._text) 
                time = time + Number(lap.TotalTimeSeconds._text)
            })
        } 
        else {
            currentPoints = processFileInMemory(activity.Lap.Track.Trackpoint)
            distance = distance + Number(activity.Lap.DistanceMeters._text) 
            time = time + Number(activity.Lap.TotalTimeSeconds._text)
        }
        pts = pts.concat(currentPoints);
    })

    let maxSpeed = 0;
    let maxHr = 0;
    let maxCad = 0;
    let maxElev = 0;
    let maxPwr = 0;
    let avgHr = 0;
    let avgCad = 0;
    let avgPwr = 0;

    let hrPtsQty = 0;
    let pwrPtsQty = 0;
    let cadPtsQty = 0;

    pts.forEach(point => {
        if (point.speed > maxSpeed) {
            maxSpeed = point.speed;
        }
        if (point.heart_rate > maxHr) {
            maxHr = point.heart_rate
        }
        if (point.cad > maxCad) {
            maxCad = point.cad
        }
        if (point.elev > maxElev) {
            maxElev = point.elev
        }
        if (point.pwr && point.pwr > maxPwr) {
            maxPwr = point.pwr
        }

        if (point.heart_rate && point.heart_rate > 30 && point.heart_rate < 200) {
            avgHr = avgHr + point.heart_rate
            hrPtsQty = hrPtsQty + 1
        }
        if (point.cad && point.cad > 10) {
            avgCad = avgCad + point.cad
            cadPtsQty = cadPtsQty + 1
        }
        if (point.pwr && point.pwr > 10) {
            avgPwr = avgPwr + point.pwr
            pwrPtsQty = pwrPtsQty + 1
        }

    })

    console.log("")
    console.log("Max speed: " + maxSpeed);
    console.log("Max HR: " + maxHr);
    console.log("Max cadence: " + maxCad);
    console.log("Max elev: " + maxElev);
    console.log("Max power: " + maxPwr);
    console.log("Average speed: " + (distance/1000)/(time/(60*60)))
    console.log("Average Heart Rate: " + avgHr / hrPtsQty)
    console.log("Average cadence: " + avgCad / cadPtsQty)
    console.log("Average power: " + avgPwr / pwrPtsQty)
    console.log("Time: " + time/(60*60) + " hours")
    console.log("Rest: " + (43.77 - time/(60*60)))
    console.log("Distance: " + distance/1000 + " km")
    console.log("\nDone with " + person + "\n")
}

start();