TextField is a labelled input, textarea or select, set apart by fill alone.

The consumer provides `label`, `hint`, `error`, `as`, `id`, `invalid`, `disabled`, `placeholder`, `value`, `onChange` and, for selects, `children`. Hint and error text are linked to the control with `aria-describedby`, and an `error` also marks the control invalid.

The label is uppercase by default. Set `labelCasing` to `asWritten` for a label longer than two words or one that holds a digit, a unit or a mixed-case term. The focus and invalid states take `--accent` and `signal-error`, so a page accent must hold 3:1 on the field.
