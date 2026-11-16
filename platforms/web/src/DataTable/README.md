DataTable shows rows of records with uppercase headers, hairline row rules and row hover.

The consumer provides `columns` as keys or `{key, label, numeric, casing}` objects and `rows` keyed by column. Mark number columns `numeric` so they right-align with tabular figures, and they never wrap. Put dates in `<time>` for the same. When a wrapper scrolls the table sideways, the first column stays fixed and fills with `--jd-table-fill`, which follows the row fill.

Set a column's `casing` to `asWritten` when its header holds a unit symbol or a mixed-case term, such as kg or e1RM.
