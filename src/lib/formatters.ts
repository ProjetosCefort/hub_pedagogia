/**
 * Utilitários de formatação e validação para formulários
 */

// CPF
export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function formatCpf(cpf: string): string {
  const cleaned = cleanCpf(cpf);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

export function isValidCpf(cpf: string): boolean {
  const cleaned = cleanCpf(cpf);
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

// RG
export function cleanRg(rg: string): string {
  return rg.replace(/\D/g, "");
}

export function formatRg(rg: string): string {
  const cleaned = cleanRg(rg);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
}

// Telefone
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatPhone(phone: string): string {
  const cleaned = cleanPhone(phone);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}

// CEP
export function cleanCep(cep: string): string {
  return cep.replace(/\D/g, "");
}

export function formatCep(cep: string): string {
  const cleaned = cleanCep(cep);
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
}

// Data
export function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateOnly(date: string | null | undefined): string {
  if (!date) return "";
  const datePart = String(date).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return formatDate(String(date));
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function parseDateOnlyValue(date: string): Date | null {
  const datePart = String(date).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseDate(dateStr: string): string {
  // Converte DD/MM/YYYY para YYYY-MM-DD
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Nome
export function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^A-Z\s]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, " ") // Remove espaços duplos
    .trim();
}

// Validação de idade
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = parseDateOnlyValue(birthDate);
  if (!birth) return 0;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function isUnder18(birthDate: string): boolean {
  return calculateAge(birthDate) < 18;
}

// Validação de email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validação de telefones diferentes
export function arePhonesDifferent(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return true;
  return cleanPhone(phone1) !== cleanPhone(phone2);
}
