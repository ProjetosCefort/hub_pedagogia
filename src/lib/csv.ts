export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return '""';
  }

  const stringValue = String(value);
  const needsQuotes = /[",\n]/.test(stringValue);
  const sanitized = stringValue.replace(/"/g, '""');
  return needsQuotes ? `"${sanitized}"` : `"${sanitized}"`;
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  if (rows.length === 0 || columns.length === 0) {
    return;
  }

  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          try {
            return escapeCsvValue(column.accessor(row));
          } catch {
            return '""';
          }
        })
        .join(","),
    )
    .join("\n");

  const csvContent = `${header}\n${body}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
