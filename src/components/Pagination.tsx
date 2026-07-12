export function Pagination(props: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(props.total / props.pageSize));
  const start = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1;
  const end = props.total === 0 ? 0 : Math.min(props.total, props.page * props.pageSize);

  return (
    <div className="pagination-bar" aria-label="Pagination controls">
      <div className="pagination-meta">Showing {start}-{end} of {props.total} attention records</div>
      <label className="field-inline">
        Rows
        <select value={String(props.pageSize)} onChange={(event) => props.onPageSizeChange(Number(event.target.value))}>
          {[10, 25, 50].map((size) => (
            <option key={size} value={String(size)}>{size}</option>
          ))}
        </select>
      </label>
      <div className="pagination-actions">
        <button type="button" className="secondary-button" disabled={props.page <= 1} onClick={() => props.onPageChange(props.page - 1)}>Previous</button>
        <span>Page {props.page} of {pages}</span>
        <button type="button" className="secondary-button" disabled={props.page >= pages} onClick={() => props.onPageChange(props.page + 1)}>Next</button>
      </div>
    </div>
  );
}
