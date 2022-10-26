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
        f.write("line,message\n")

        for row in rows:
            f.write(f"{row['line']},{row['message']}\n")


if __name__ == "__main__":
    main()

