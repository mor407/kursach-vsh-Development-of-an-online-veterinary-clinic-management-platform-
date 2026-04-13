/** «Иванов Иван Петрович» → «Иванов И. П.» */
export function toSurnameWithInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const surname = parts[0];
  const initials = parts
    .slice(1)
    .map((p) => `${(p[0] ?? "").toLocaleUpperCase("ru-RU")}.`)
    .join(" ");
  return `${surname} ${initials}`;
}
