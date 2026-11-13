DataMatrix shows a compact metric grid with tabular figures and hairline rules between cells, inside a Card or on its own.

The consumer provides `columns` as keys or `{key, label, numeric, width, casing}` objects, `rows` keyed by column and `label` for assistive technology. Use DataTable for browsing records and DataMatrix for comparing a few metrics.

Headers are uppercase. Set a column's `casing` to `asWritten` when its header holds a unit symbol or a mixed-case term, such as kg or e1RM. Empty cells keep their baseline and are announced as empty.
