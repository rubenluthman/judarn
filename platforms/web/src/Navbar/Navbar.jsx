import { cx } from "../internal/cx.js";

/**
 * Navbar – top bar with brand + nav links set as written (links are controls).
 */
export function Navbar({ brand = "JUDARN", links = [], current, actions, className, ...rest }) {
  return (
    <nav {...rest} className={cx("navbar", className)}>
      <div className="navbar__brand">{brand}</div>
      <ul className="navbar__links">
        {links.map((l) => {
          const label = typeof l === "string" ? l : l.label;
          const href = typeof l === "string" ? "#" : (l.href || "#");
          return (
            <li key={label}>
              <a
                className="navbar__link"
                href={href}
                aria-current={label === current ? "page" : undefined}
              >
                {label}
              </a>
            </li>
          );
        })}
        {actions ? <li>{actions}</li> : null}
      </ul>
    </nav>
  );
}

export default Navbar;
