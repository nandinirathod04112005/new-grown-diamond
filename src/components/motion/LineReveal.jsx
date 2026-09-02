import styles from './LineReveal.module.css';

/**
 * Renders pre-split lines, matching the reference site's markup contract:
 * `data-lines="4"` with `--total: 4` on the block, one masked line each.
 *
 * Lines are authored, never measured. That is deliberate — it is how the
 * reference site does it, it removes a runtime text-splitting dependency, and
 * it means the line breaks are a typographic decision rather than an accident
 * of viewport width. Screen readers get the joined string, so the visual
 * break-up never reaches assistive technology.
 */
export default function LineReveal({
  lines,
  as: Tag = 'p',
  className,
  lead = false,
  progress,
}) {
  // A caller may pin --p, which deliberately shadows the value inherited from
  // the scene. The hero uses this: its copy belongs to the intro sequence, not
  // to the scroll, so it must be present at rest and leave only on exit.
  const pinned = progress === undefined ? undefined : { '--p': progress };
  return (
    <Tag
      className={`${styles.root} ${className ?? ''}`}
      data-lines={lines.length}
      data-lead={lead ? '' : undefined}
      style={{ '--total': lines.length, ...pinned }}
    >
      <span className="u-visually-hidden">{lines.join(' ')}</span>
      <span aria-hidden="true">
        {lines.map((line, i) => (
          <span key={line} className={styles.line}>
            <span className={styles.inner} style={{ '--i': i }}>
              {line}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
