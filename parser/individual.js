const convert = require("xml-js");
const fs = require("fs");

function start() {
    let newDirectory = "./new"
    let prefix = "data"
    let dirs = ["vt", "tg", "pg", "fj"];
    let pts = [];

    if (!fs.existsSync(newDirectory)) {
        fs.mkdirSync(newDirectory);
    }
    dirs.forEach(dir => {
        let newPts = processPerson(prefix + "/", dir);
        pts = pts.concat(newPts)

        fs.writeFileSync(newDirectory +  "/" + dir + ".js", "var points = " + JSON.stringify(pts));
        console.log("Done with " + dir + "\n")
        pts = []
    })
    console.log("\nDone with all")
}

function processFileInMemory(goodies, person) {
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
            if (pwr === NaN) {
                pwr = 0
            }
            speed = Number(speed.toFixed(2))
            lat = Number(lat.toFixed(6))
            lng = Number(lng.toFixed(6));
            elev = Number(elev.toFixed(0));
            let cad = goodie.Cadence ? Number(goodie.Cadence._text) : 0;
            let hr = goodie.HeartRateBpm ? Number(goodie.HeartRateBpm.Value._text) : 0;
    
            let newObj =  {id: id, elev: elev, speed: speed, lat: lat, lng: lng, cad: cad, heart_rate: hr, time: time}
            if (goodie.Extensions["ns3:TPX"] && goodie.Extensions["ns3:TPX"]["ns3:Watts"]) {
                newObj.pwr = pwr;
            }
 
            pts.push(newObj);
            id += 1;
        }
    })
    return pts;
}

function processPerson(prefix, person) {
    console.log("Starting with: " + person)
    // initialize values for person
    let pts = [];
    let distance = 0;
    let time = 0;

    // get all files for person
    let filenames = fs.readdirSync(prefix + person);

    filenames.forEach((filename, idx) => {
        idx += 1;
        let currentPoints = [];

        let data = fs.readFileSync(prefix + person + "/" + filename);
        let result = convert.xml2json(data, {
            compact: true,
            spaces: 4
        });

        let activity = JSON.parse(result).TrainingCenterDatabase.Activities.Activity;
        if (Array.isArray(activity.Lap)) {
            activity.Lap.forEach((lap) => {
                let newPoints = processFileInMemory(lap.Track.Trackpoint, person)
                currentPoints = currentPoints.concat(newPoints)
                distance = distance + Number(lap.DistanceMeters._text) 
                time = time + Number(lap.TotalTimeSeconds._text)
            })
        } 
        else {
            currentPoints = processFileInMemory(activity.Lap.Track.Trackpoint, person)
            distance = distance + Number(activity.Lap.DistanceMeters._text) 
            time = time + Number(activity.Lap.TotalTimeSeconds._text)
        }
        pts = pts.concat(currentPoints);
    })

    return pts
}

start();