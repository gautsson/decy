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

    })
    fs.writeFileSync(newDirectory + "/all.js", "var points = " + JSON.stringify(pts));
    console.log("\nDone with all")
}

function processFileInMemory(goodies, person) {
    let pts = [];
    let id = 0;

    goodies.forEach(goodie => {
        if (goodie.Position) {
            let lat = Number(goodie.Position.LatitudeDegrees._text);
            let lng = Number(goodie.Position.LongitudeDegrees._text);
            let speed = 0;
            if (goodie.Extensions["ns3:TPX"]) {
                speed = goodie.Extensions["ns3:TPX"]["ns3:Speed"] ? Number(goodie.Extensions["ns3:TPX"]["ns3:Speed"]._text) * 3.6 : 0;
            } else if (goodie.Extensions.TPX) {
                speed = goodie.Extensions.TPX.Speed ? Number(goodie.Extensions.TPX.Speed._text) * 3.6 : 0;
            }
            speed = Number(speed.toFixed(2))
            lat = Number(lat.toFixed(6))
            lng = Number(lng.toFixed(6));
            let newObj = {
                // speed: speed,
                lat: lat,
                lng: lng,
                usr: person,
                id: id
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