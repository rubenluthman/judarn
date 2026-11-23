TextField is a labelled input, textarea or select, set apart by fill alone.

The consumer provides `label`, `hint`, `error`, `as`, `id`, `invalid`, `disabled`, `placeholder`, `value`, `onChange` and, for selects, `children`. Hint and error text are linked to the control with `aria-describedby`, and an `error` also marks the control invalid.

The label is uppercase by default. Set `labelCasing` to `asWritten` for a label longer than two words or one that holds a digit, a unit or a mixed-case term. A focused field shows one line, its focus ring, in `--accent` (`signal-error` when invalid); an unfocused invalid field keeps a `signal-error` edge. A page accent must hold 3:1 on the field.
