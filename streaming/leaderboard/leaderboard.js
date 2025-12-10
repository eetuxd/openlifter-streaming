const urlParams = new URLSearchParams(window.location.search);
const rotationTimeSeconds = parseInt(urlParams.get("rotation") || 15);
const authRequired = JSON.parse(urlParams.get("auth") || "true");
const entriesPerTable = parseInt(urlParams.get("entries_per_table") || 100);
const entriesGrouping = urlParams.get("entries_grouping") || "points";
const apiUrl = urlParams.get("apiurl") || "https://localhost:3001";
const apiKey = urlParams.get("apikey") || "441b6244-8a4f-4e0f-8624-e5c665ecc901";
const refreshTimeSeconds = parseInt(urlParams.get("refresh") || 1);

//uncomment this to make the table english
//var tableHeaders = ["Rank", "Lifter", "Class", /*"Body weight", "Age",*/ "Squat", "Bench", "Deadlift", "Total", "Points", "Prognosis"];
//uncomment this to make the table finnish
var tableHeaders = ["Nostaja", "Painoluokka", "Sarja", "Kyykky 1", "Kyykky 2", "Kyykky 3", "Penkki 1", "Penkki 2", "Penkki 3", "Maastaveto 1", "Maastaveto 2", "Maastaveto 3", "Yhteistulos","Pisteet", "Ennuste"];
//var tableHeaders = ["Pisteet", "Nostaja", "Kyykky", "Penkki", "Maastaveto", "Yhteistulos"];

//As you can see, changing what information is in the leaderboard table is quite straightforward.

var inKgs = true; // default; will be updated by API response

const femaleClasses = [
    { max: 47, label: "-47" },
    { max: 52, label: "-52" },
    { max: 57, label: "-57" },
    { max: 63, label: "-63" },
    { max: 69, label: "-69" },
    { max: 76, label: "-76" },
    { max: 84, label: "-84" },
    { max: Infinity, label: "+84" }
  ];

  const maleClasses = [
    { max: 59, label: "-59" },
    { max: 66, label: "-66" },
    { max: 74, label: "-74" },
    { max: 83, label: "-83" },
    { max: 93, label: "-93" },
    { max: 105, label: "-105" },
    { max: 120, label: "-120" },
    { max: Infinity, label: "+120" }
  ];

  const coefficients = {
        "M": {
          "Sleeves": {
            "SBD": [1199.72839, 1025.18162, 0.009210],
            "B": [320.98041, 281.40258, 0.01008]
          },
          "Single-ply": {
            "SBD": [1236.25115, 1449.21864, 0.01644],
            "B": [381.22073, 733.79378, 0.02398]
          }
        },
        "F": {
          "Sleeves": {
            "SBD": [610.32796, 1045.59282, 0.03048],
            "B": [142.40398, 442.52671, 0.04724]
          },
          "Single-ply": {
            "SBD": [758.63878, 949.31382, 0.02435],
            "B": [221.82209, 357.00377, 0.02937]
          }
        }
      };

  
function getGL(bw, total, sex, equipment){
  //Hardcoded to only work on SBD meets.
  var params = coefficients[sex][equipment]["SBD"];
  var denom = params[0] - (params[1] * Math.exp(-1.0 * params[2] * bw))
  var glp = (denom === 0) ? 0 : Math.max(0, total * 100.0 / denom)
  if (isNaN(glp) || bw < 35) {
    glp = 0;
  }
  return glp.toFixed(2);

}
var timeInSecs;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var ticker;
var fetchHeaders = {};

function startTimer(secs) {
  timeInSecs = parseInt(secs);
  ticker = setInterval("tick()", 1000);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function tick() {
  var secs = timeInSecs;
  if (secs > 0) {
    timeInSecs--;
    console.log("Refresh in " + secs);
  } else {
    generateTable();
    console.log("Refreshed");
    timeInSecs = refreshTimeSeconds;
  }
}

  function weightClassify(bw, sex, age){
  if(sex == 'M') {
    //Warning: code below does not take onto account that a lifter could be 23 but not a junior. 
    if(age <= 23 && bw <= 53){
      return "-53";
    }
    for (const maleClass of maleClasses) {
    if (bw <= maleClass.max) return maleClass.label;
    }
  }
  else if(sex == 'F') {
    //Warning: code below does not take onto account that a lifter could be 23 but not a junior. 
    if(age <= 23 && bw <= 43){
      return "-43";
    }
    for (const femaleClass of femaleClasses) {
    if (bw <= femaleClass.max) return femaleClass.label;
    }
  }
  else {
    //Rare sight
    return 0;
  }
}

function kgToLbs(kgs) {
  return Math.floor(kgs * 2.20462);
}

function generateTableHead(table, headers) {
  let thead = table.createTHead();
  let row = thead.insertRow();
  for (let key of headers) {
    let th = document.createElement("th");
    th.textContent = key;
    row.appendChild(th);
  }
}

function getMaxAttempt(lifts, status) {
  let max = 0;
  for(let i = 0; i < lifts.length; i++){
    if(lifts[i] > max && status[i] != -1){
      max = lifts[i];
    }
  }
  return max;
}

function getMaxSuccessAttempt(lifts, status) {
  let max = 0;
  for(let i = 0; i < lifts.length; i++){
    if(lifts[i] > max && status[i] == 1){
      max = lifts[i];
    }
  }
  return max;
}

function generateRows(table, weightClass = null, data, chunk) {
  let total;
  var rank = 1;
  let tbody = table.tBodies[0];

  for (let element of data) {
    let row = tbody.insertRow();

    for (let header of tableHeaders) {
      let cell = row.insertCell();
      cell.className = header;

      switch (header) {
        case "Rank":
        case "Sijoitus":
        case "Sijoitus ryhmän sisällä":
          cell.textContent = rank++ ;
          break;
        case "Lifter":
        case "Nostaja":
          cell.textContent = element.name;
          break;
        case "Class":
        case "Painoluokka":
          cell.textContent = weightClassify(element.bodyweightKg, element.sex, element.age) + "KG";
          break;
        case "Body weight":
        case "Kehonpaino":
          cell.textContent = element.bodyweightKg || "";
          break;
        case "Age class":
        case "Sarja":
          cell.textContent = element.divisions || "";
          break;
        case "Age":
        case "Ikä":
          cell.textContent = element.age || "";
          break;
        case "Squat":
        case "Kyykky":
          cell.textContent = element.squatBest;
          break;
        case "Squat 1":
        case "Kyykky 1":
          cell.textContent = element.squatKg[0];
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");
          if (element.squatStatus[0] === 1) cell.classList.add("goodLift");
          if (element.squatStatus[0] === -1) cell.classList.add("badLift");
          break;
        case "Squat 2":
        case "Kyykky 2":
          cell.textContent = element.squatKg[1];     
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");   
          if (element.squatStatus[1] === 1) cell.classList.add("goodLift");
          if (element.squatStatus[1] === -1) cell.classList.add("badLift");  
          break;
        case "Squat 3":
        case "Kyykky 3":
          cell.textContent = element.squatKg[2]; 
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");  
          if (element.squatStatus[2] === 1) cell.classList.add("goodLift");
          if (element.squatStatus[2] === -1) cell.classList.add("badLift");       
          break;
        case "Bench":
        case "Penkki":
          cell.textContent = element.squatBest;
          break;
        case "Bench 1":
        case "Penkki 1":
          cell.textContent = element.benchKg[0];   
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");
          if (element.benchStatus[0] === 1) cell.classList.add("goodLift");
          if (element.benchStatus[0] === -1) cell.classList.add("badLift"); 
          break;
        case "Bench 2":
        case "Penkki 2":
          cell.textContent = element.benchKg[1];   
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");
          if (element.benchStatus[1] === 1) cell.classList.add("goodLift");
          if (element.benchStatus[1] === -1) cell.classList.add("badLift"); 
          break;
        case "Bench 3":
        case "Penkki 3":
          cell.textContent = element.benchKg[2];   
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");
          if (element.benchStatus[2] === 1) cell.classList.add("goodLift");
          if (element.benchStatus[2] === -1) cell.classList.add("badLift"); 
          break;
        case "Deadlift":
        case "Maastaveto":
          cell.textContent = element.deadliftBest;
          break;
        case "Deadlift 1":
        case "Maastaveto 1":
          cell.textContent = element.deadliftKg[0];   
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");
          if (element.deadliftStatus[0] === 1) cell.classList.add("goodLift");
          if (element.deadliftStatus[0] === -1) cell.classList.add("badLift"); 
          break;
        case "Deadlift 2":
        case "Maastaveto 2":
          cell.textContent = element.deadliftKg[1];   
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");
          if (element.deadliftStatus[1] === 1) cell.classList.add("goodLift");
          if (element.deadliftStatus[1] === -1) cell.classList.add("badLift"); 
          break;
        case "Deadlift 3":
        case "Maastaveto 3":
          cell.textContent = element.deadliftKg[2];   
          cell.classList.remove("goodLift");
          cell.classList.remove("badLift");
          if (element.deadliftStatus[2] === 1) cell.classList.add("goodLift");
          if (element.deadliftStatus[2] === -1) cell.classList.add("badLift"); 
          break;
        case "Total":
        case "Yhteistulos":
          if (inKgs) {
            cell.textContent = `${element.total} kg`;
          } else {
            cell.textContent = `${kgToLbs(element.total)} lb | ${element.total} kg`;
          }
          break;
        case "Points":
        case "Pisteet":
          cell.textContent = element.points;
          break;
        case "Prognosis":
        case "Ennuste":
          cell.textContent = element.predictedGL;
          break;
        default:
          cell.textContent = "";
      }
    }
  }
}

async function handleTableLoop(table, data) {
  document.getElementById("leaderboardDescription").innerHTML = data.meetInfo.name;

  //Adding important elements for sorting and such
  for (let element of data.orderedEntries) {
    let squatMax = getMaxAttempt(element.squatKg, element.squatStatus);
    let benchMax = getMaxAttempt(element.benchKg, element.benchStatus);
    let deadliftMax = getMaxAttempt(element.deadliftKg, element.deadliftStatus);

    element.squatBest = getMaxSuccessAttempt(element.squatKg, element.squatStatus);
    element.benchBest = getMaxSuccessAttempt(element.benchKg, element.benchStatus);
    element.deadliftBest = getMaxSuccessAttempt(element.deadliftKg, element.deadliftStatus);

    let predictiontotal = squatMax + benchMax + deadliftMax;
    element.predictedGL = getGL(element.bodyweightKg, predictiontotal, element.sex, element.equipment);

    element.total = element.squatBest + element.benchBest + element.deadliftBest;
    element.points = getGL(element.bodyweightKg, element.total, element.sex, element.equipment);
  }

  //Comment line below if you want the leaderboard to
  //show lifters on the order which they will lift in
  data.orderedEntries.sort((a, b) => b.points - a.points);

  table.innerHTML = ""; 
  const newTable = document.createElement("table");
  generateTableHead(newTable, tableHeaders);
  newTable.createTBody();
  generateRows(newTable, null, data.orderedEntries);
  newTable.id = table.id;
  table.replaceWith(newTable);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateTable() {
  var table = document.getElementById("leaderboardTable");
  let fetchHeaders = authRequired
    ? {
        //"x-api-key": apiKey,
        "Content-Type": "application/json",
      }
    : {
        "Content-Type": "application/json",
      };

  try {
    const response = await fetch("/", {
      method: "GET",
      headers: fetchHeaders,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    inKgs = data.inKg ?? true;
    delete data["inKg"];

    await handleTableLoop(table, data);
  } catch (error) {
    console.error("Failed to fetch or render leaderboard data:", error);
  }
}

//Start the table generation on page load
window.onload = () => {
  generateTable();
  startTimer(refreshTimeSeconds);
};