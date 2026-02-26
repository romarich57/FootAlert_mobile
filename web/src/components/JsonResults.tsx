import { prettyJson } from '@/lib/format';

type JsonResultsProps<T> = {
  title: string;
  items: T[];
  itemTitle?: (item: T, index: number) => string;
};

export function JsonResults<T>({ title, items, itemTitle }: JsonResultsProps<T>) {
  return (
    <div className="content-card">
      <h2>{title}</h2>
      <p>{items.length} item(s)</p>

      <div className="result-list">
        {items.map((item, index) => (
          <article className="result-item" key={`result-${title}-${index}`}>
            <h4>{itemTitle ? itemTitle(item, index) : `Item ${index + 1}`}</h4>
            <pre>{prettyJson(item)}</pre>
          </article>
        ))}
      </div>
    </div>
  );
}
