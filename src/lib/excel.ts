export interface ExcelColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

function escapeHtml(value: unknown) {
  const text = String(value ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function downloadExcel<T>(filename: string, rows: T[], columns: ExcelColumn<T>[]) {
  if (rows.length === 0 || columns.length === 0) {
    return;
  }

  const headerRow = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("");
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          try {
            return `<td>${escapeHtml(column.accessor(row))}</td>`;
          } catch {
            return "<td></td>";
          }
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>${headerRow}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>`;

  const blob = new Blob([`\ufeff${html}`], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
