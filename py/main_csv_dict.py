import csv
import sys


def main():
    args = sys.argv
    filename = args[1]
    n_max = int(args[2])

    rows = []

    for n in range(1, n_max + 1):
        rows.append(dict(
            line=n,
            message="0" * n,
        ))

    with open(filename, "w") as f:
        writer = csv.DictWriter(f, fieldnames=["line", "message"])
        writer.writeheader()

        for row in rows:
            # The actual writing to a buffer is implemented in C but there is a bit
            # extra overhead (in Python) during the `writerow` call
            #
            # For implementation see: https://github.com/python/cpython/blob/main/Lib/csv.py#L160
            writer.writerow(row)


if __name__ == "__main__":
    main()

