use std::env;

use serde::Serialize;

#[derive(Debug, Serialize)]
struct Row {
    line: usize,
    message: String,
}

#[derive(Debug)]
struct Rows(Vec<Row>);

impl Rows {
    fn new() -> Self {
        Self(Vec::new())
    }

    fn add(&mut self, row: Row) {
        self.0.push(row);
    }

    fn iter(&self) -> impl Iterator<Item=&Row> {
        self.0.iter()
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let filename = args.get(1).unwrap();
    let n_max: usize = args.get(2).unwrap().parse().unwrap();

    let mut rows = Rows::new();

    for n in 1..=n_max {
        rows.add(Row {
            line: n,
            message: "0".repeat(n),
        });
    }

    let mut writer = csv::Writer::from_path(filename).unwrap();

    for row in rows.iter() {
        writer.serialize(row).unwrap();
    }

    writer.flush().unwrap();
}
