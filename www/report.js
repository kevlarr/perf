/**
 * Utility class to make working with known query parameters easier
 */
class Params {
  #params;
  #file;
  #hidden;
  #metric;

  constructor() {
    this.#params = (new URL(document.location)).searchParams;

    this.#file   = this.#params.get("file")   || "results.csv";
    this.#metric = this.#params.get("metric") || "user";

    this.#hidden = (this.#params.get("hide") || "").split(",");
  }

  get file() {
    return this.#file;
  }

  get metric() {
    return this.#metric;
  }

  set metric(metric) {
    this.#metric = metric;
    this.#params.set("metric", metric);
    this.#updateQuery({ reload: true });
  }

  isCommandHidden(command) {
    return this.#hidden.includes(command);
  }

  showCommand(command) {
    this.#hidden = this.#hidden.filter(cmd => cmd != command);
    this.#updateHideParams();
  }

  hideCommand(command) {
    if (!this.#hidden.includes(command)) {
      this.#hidden.push(command);
    }

    this.#updateHideParams();
  }

  #updateHideParams({ reload } = { reload: false }) {
    this.#params.set("hide", this.#hidden);
    this.#updateQuery();
  }

  #updateQuery({ reload } = { reload: false }) {
    let search = this.#params.toString();

    if (reload) {
      window.location.search = search;
    } else {
      let url = new URL(window.location);

      url.search = this.#params.toString();
      history.pushState(null, null, url);
    }
  }
}

/**
 * Retrieves CSV results and converts to list of objects
 */
async function fetchResults(filename) {
  return fetch(filename)
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
 * Aggregates results by command and `n` size, extracting the desired metric
 */
function groupResults(results, metric) {
  const grouped = {};

  results.forEach((result, i) => {
    if (result.code != 0) {
      throw new Error(`Bad result at index ${i}: ${JSON.stringify(result)}`);
    }

    let file = getWithDefault(grouped, result.file, {});
    let fileN = getWithDefault(file, result.n, []);

    fileN.push(Number.parseFloat(result[metric]));
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

const ChartHelpers = {
  /**
   * Returns the 2d canvas context
   */
  context() {
    return document.getElementById("mainCanvas").getContext("2d");
  },

  /**
   * Returns the title for the chart based on provided metric
   */
  title(metric) {
    switch (metric) {
      case "user": return "CPU Time (Process)";
      case "sys": return "CPU Time (System)";
      case "maxrss": return "Maximum Resident Set Size";
    }
  },

  /**
   * Returns the appropriate line color based on command name
  */
  lineColor(command) {
    if (command.startsWith("js/")) { return [  0, 185,  95]; }
    if (command.startsWith("py/")) { return [225, 190,   0]; }
    if (command.startsWith("rs/")) { return [225, 120,   0]; }

    return [0, 0, 0];
  },

  /**
   * Returns the y-axis label based on the metric
   */
  yAxisLabel(metric) {
    switch (metric) {
      case "user":
      case "sys":
        return "Time (seconds)";
      case "maxrss":
        return "Maximum RSS (MB)";
    }
  },
};

(async function main() {
  const params = new Params();

  const raw = await fetchResults(params.file);
  const grouped = groupResults(raw, params.metric);
  const averaged = averageResults(grouped);

  const datasets = Object.entries(averaged).map(([command, vals]) => ({
    label: command,
    data: vals.reduce((obj, [x, y]) => ({...obj, [x]: y}), {}),
    fill: false,
    borderColor: `rgb(${ChartHelpers.lineColor(command)})`,
    hidden: params.isCommandHidden(command),
  }));

  new Chart(ChartHelpers.context(), {
    type: "line",
    data: {
      datasets,
    },
    options: {
      datasets: {
        line: {
          borderWidth: 1,
        },
      },
      plugins: {
        legend: {
          position: "right",

          onClick(evt, item, legend) {
            item.hidden
              ? params.showCommand(item.text)
              : params.hideCommand(item.text);

            return Chart.defaults.plugins.legend.onClick(evt, item, legend);
          },

          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            pointStyleWidth: 36,
          },
        },
        title: {
          display: true,
          text: ChartHelpers.title(params.metric),
          font: {
            size: 24,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Data Size (elements)",
          },
          ticks: {
            callback(value, _index, _ticks) {
              return Number.parseInt(this.getLabelForValue(value)).toLocaleString();
            }
          },
        },
        y: {
          title: {
            display: true,
            text: ChartHelpers.yAxisLabel(params.metric),
          },
        },
      },
    },
  });
})();
