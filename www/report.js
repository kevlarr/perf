/**
 * Retrieves CSV results and converts to list of objects
 */
async function fetchResults() {
  return fetch("report.csv")
    .then(resp => resp.text())
    .then(csvToObjects);
}

/**
 * Converts CSV text to an array of objects
 */
function csvToObjects(text) {
  let cols;
  let objs = [];

  text.split("\n").forEach(line => {
    if (line.length == 0) {
      return;
    }

    if (line.search("file") > -1) {
      cols = line.split(",").reduce((obj, col, i) => {
        obj[i] = col;
        return obj;
      }, {});

      return;
    }

    objs.push(line.split(",").reduce((obj, val, i) => {
      obj[cols[i]] = val;
      return obj;
    }, {}));
  });

  return objs;
}

/**
 * Returns value at property, first setting provided default
 * if property is not in object
 */
function getWithDefault(object, property, default_) {
  if (!object.hasOwnProperty(property)) {
    object[property] = default_;
  }

  return object[property];
}

/**
 * Aggregates results by command and `n` size
 */
function groupResults(results) {
  const grouped = {};

  results.forEach((result, i) => {
    if (result.code != 0) {
      throw new Error(`Bad result at index ${i}: ${JSON.stringify(result)}`);
    }

    let file = getWithDefault(grouped, result.file, {});
    let fileN = getWithDefault(file, result.n, []);

    fileN.push(Number.parseFloat(result.user)); // TODO: Parameterize `user`
  });

  return grouped;
}

/**
 * Averages results for each command
 */
function averageResults(results) {
  return Object.entries(results).reduce((obj, [command, vals]) => {
    obj[command] = Object.entries(vals).reduce((arr, [n, xs]) => {
      arr.push([
        Number.parseInt(n),
        xs.reduce((sum, x) => sum + x, 0) / xs.length,
      ])

      return arr;
    }, []);

    return obj;
  }, {});
}

function colorize(command) {
  if (command.startsWith("js/")) { return [  0, 185,  95]; }
  if (command.startsWith("py/")) { return [225, 190,   0]; }
  if (command.startsWith("rs/")) { return [225, 120,   0]; }

  return [0, 0, 0];
}

(async function main() {
  const raw = await fetchResults();
  const grouped = groupResults(raw);
  const averaged = averageResults(grouped);

  const ctx = document.getElementById("mainCanvas").getContext("2d");
  const datasets = Object.entries(averaged).map(([command, vals]) => ({
    label: command,
    data: vals.reduce((obj, [x, y]) => ({...obj, [x]: y}), {}),
    fill: false,
    borderColor: `rgb(${colorize(command)})`,
  }));

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets,
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: "Iterations",
          },
          ticks: {
            callback(value, index, ticks) {
              return Number.parseInt(this.getLabelForValue(value)).toLocaleString();
            }
          },
        },
        y: {
          title: {
            display: true,
            text: "Seconds",
          },
        },
      },
    },
  });
})();
