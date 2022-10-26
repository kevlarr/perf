import csv
from dataclasses import dataclass
import sys


@dataclass
class Row:
    line: int
    message: str

    # `keys` and `get` make this compatible with `DictWriter:writerow` -
    # in other words, why traits in Rust are awesome
    def keys(self):
        return self.__dict__.keys()

    def get(self, attr, _default):
        return getattr(self, attr)


class Rows:
    def __init__(self):
        self._rows = []

    def add(self, row: Row):
        self._rows.append(row)

    def __iter__(self):
        return iter(self._rows)


def main():
    args = sys.argv
    filename = args[1]
    n_max = int(args[2])

    rows = Rows()

    for n in range(1, n_max + 1):
        rows.add(Row(
            line=n,
            message="0" * n,
        ))

    with open(filename, "w") as f:
        writer = csv.DictWriter(f, fieldnames=["line", "message"])
        writer.writeheader()

        for row in rows:
            writer.writerow(row)


if __name__ == "__main__":
    main()

