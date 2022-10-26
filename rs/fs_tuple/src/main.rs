use std::{env, fs::File, io::prelude::*};

fn main() {
    let args: Vec<String> = env::args().collect();
    let filename = args.get(1).unwrap();
    let n_max: usize = args.get(2).unwrap().parse().unwrap();

    let mut rows = Vec::new();

    for n in 1..=n_max {
        rows.push((n, "0".repeat(n)));
    }

    let mut file = File::create(filename).unwrap();
    file.write("line,message\n".as_bytes()).unwrap();

    for row in rows {
        file.write(&format!("{},{}\n", row.0, row.1).as_bytes()).unwrap();
    }
}
