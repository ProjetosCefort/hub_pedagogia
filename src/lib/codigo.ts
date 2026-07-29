export function generateCadastroCodigo(prefix: string, label: string) {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 24);

  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return [prefix, normalized || "ITEM", suffix].join("-");
}
