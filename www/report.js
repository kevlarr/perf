/**
 * Utility singleton to make working with known query parameters easier,
 * since not all query parameters are controlled by the `<form>` element
 */
const PARAMS = new (class Params {
  #params;
  #file;
  #excludedCommands;
  #excludedLanguages;
  #metric;

  constructor() {
    this.#params = (new URL(document.location)).searchParams;

    // Only metric makes sense to have a default value
    this.#metric = this.#params.get("metric") || "user";

    this.#file   = this.#params.get("file");
    this.#excludedCommands = this.#getAll("excludedCommands");
    this.#excludedLanguages = this.#getAll("excludedLanguages");
  }

  get file() {
    return this.#file;
  }

  set file(filename) {
    this.#file = filename;
    this.#params.set("file", filename);
    this.#updateQuery({ reload: true });
  }

  get metric() {
    return this.#metric;
  }

  set metric(metric) {
    this.#metric = metric;
    this.#params.set("metric", metric);
    this.#updateQuery({ reload: true });
  }

  commandHidden(command) {
    return this.#excludedCommands.has(command);
  }

  languageDisabled(lang) {
    return this.#excludedLanguages.has(lang);
  }

  enableLanguage(lang) {
    this.#excludedLanguages.delete(lang);
    this.#updateExcludedLanguages();
  }

  disableLanguage(lang) {
    this.#excludedLanguages.add(lang);
    this.#updateExcludedLanguages();
  }

  showCommand(command) {
    this.#excludedCommands.delete(command);
    this.#updateExcludedCommands();
  }

  hideCommand(command) {
    this.#excludedCommands.add(command);
    this.#updateExcludedCommands();
  }

  #updateExcludedCommands() {
    this.#params.set("excludedCommands", Array.from(this.#excludedCommands));
    this.#updateQuery({ reload: false });
  }

  #updateExcludedLanguages({ reload } = { reload: false }) {
    this.#params.set("excludedLanguages", Array.from(this.#excludedLanguages));
    this.#updateQuery({ reload: true });
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

  #getAll(key) {
    let vals = this.#params.get(key);

    return vals
      ? new Set(vals.split(","))
      : new Set();
  }
})();

/**
 * Retrieves CSV results and converts to list of objects
 */
async function fetchResults(filename) {
  if (!filename) { return null; }

  return fetch(filename)
    .then(resp => {
      if (resp.status === 200) {
        return resp.text();
      }

      throw new Error(resp.statusText);
    })
    .then(csvToObjects)
    .catch(e => {
      document.getElementById("error").innerText = e;

      return null;
    });
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
        return "Max Resident Set Size (MB)";
    }
  },
};

(async function main() {
  let fileInput = document.getElementById("resultFile");

  fileInput.value = PARAMS.file;
  fileInput.addEventListener("blur", () => {
    PARAMS.file = fileInput.value;
  });

  document
    .querySelectorAll("input[type=checkbox][name='language']")
    .forEach(node => {
      if (!PARAMS.languageDisabled(node.value)) {
        node.setAttribute("checked", true);
      }

      node.addEventListener("change", () => {
        node.checked
          ? PARAMS.enableLanguage(node.value)
          : PARAMS.disableLanguage(node.value);
      });
    });

  document
    .querySelectorAll("input[type=radio][name='metric']")
    .forEach(node => {
      if (PARAMS.metric === node.value) {
        node.setAttribute("checked", true);
      }

      node.addEventListener("change", () => {
        PARAMS.metric = node.value;
      });
    });

  const raw = await fetchResults(PARAMS.file);

  if (!raw) {
    fileInput.focus();
    return;
  }

  const grouped = groupResults(raw, PARAMS.metric);
  const averaged = averageResults(grouped);

  const datasets = Object.entries(averaged)
    .filter(([command, _vals]) => (
      !PARAMS.languageDisabled(command.slice(0, 2))
    ))
    .map(([command, vals]) => ({
      label: command,
      data: vals.reduce((obj, [x, y]) => ({...obj, [x]: y}), {}),
      fill: false,
      borderColor: `rgb(${ChartHelpers.lineColor(command)})`,
      hidden: PARAMS.commandHidden(command),
    }));

  new Chart(ChartHelpers.context(), {
    type: "line",
    data: {
      datasets,
    },
    options: {
      maintainAspectRatio: false,

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
              ? PARAMS.showCommand(item.text)
              : PARAMS.hideCommand(item.text);

            return Chart.defaults.plugins.legend.onClick(evt, item, legend);
          },

          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            pointStyleWidth: 36,

            sort(a, b, { datasets, labels }) {
              let xMax = labels[labels.length - 1];
              let yA = datasets[a.datasetIndex].data[xMax];
              let yB = datasets[b.datasetIndex].data[xMax];

              return yB - yA;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Data Size (elements)",
            font: {
              size: 18,
              weight: "bold",
            },
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
            text: ChartHelpers.yAxisLabel(PARAMS.metric),
            font: {
              size: 18,
              weight: "bold",
            },
          },
        },
      },
    },
  });
})();
