#!/usr/bin/env node

const fs = require("fs");
const { stringify } = require("csv");


(function main() {
  let args = process.argv;
  let filename = args[2];
  let nMax = args[3];

  let rows = [];

  for (let n = 1; n <= nMax; n++) {
    rows.push({
      line: n,
      message: "0".repeat(n),
    });
  }

  let writeStream = fs.createWriteStream(filename /*, { flags: "w" } */);
  let stringifier = stringify({
    header: true,
    columns: ["line", "message"],
  });

  rows.forEach(row => {
    stringifier.write(row);
  });

  stringifier.pipe(writeStream);
}
)();
