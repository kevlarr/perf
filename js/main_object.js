#!/usr/bin/env node

const fs = require("fs");

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

  let writer = fs.createWriteStream(filename, { flags: "w" });
  writer.write("line,message\n");

  rows.forEach(row => {
    writer.write(`${row.line},${row.message}\n`);
  });

  writer.end();
}
)();
