export interface Crumb {
  label: string;
  href: string;
}

/** The trail from Home to the current page; the last crumb is the page itself. */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol class="crumbs">
        {items.map((item, i) => (
          <li key={item.href}>
            {i === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <a href={item.href}>{item.label}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
