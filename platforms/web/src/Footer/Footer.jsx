import { cx } from "../internal/cx.js";

/**
 * Footer – three-column footer with hairline top rule. Column heads are `h2` headings set as `t-label`;
 * `headCasing="asWritten"` keeps them as written.
 */
export function Footer({ brand = "JUDARN", tagline, columns = [], headCasing = "uppercase", className, ...rest }) {
  const headClass = headCasing === "asWritten" ? "jd-footer__head t-label t-as-written" : "jd-footer__head t-label";
  return (
    <footer {...rest} className={cx("jd-footer", className)}>
      <div className="jd-footer__col">
        <div className="jd-navbar__brand">{brand}</div>
        {tagline ? <p className="jd-footer__link" style={{ marginTop: "8px" }}>{tagline}</p> : null}
      </div>
      {columns.map((col) => (
        <div className="jd-footer__col" key={col.head}>
          <h2 className={headClass}>{col.head}</h2>
          {(col.links || []).map((l) => {
            const label = typeof l === "string" ? l : l.label;
            const href = typeof l === "string" ? "#" : (l.href || "#");
            return <a className="jd-footer__link" href={href} key={label}>{label}</a>;
          })}
        </div>
      ))}
    </footer>
  );
}

export default Footer;
