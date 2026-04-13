import type { MeUser } from "../types/user";

export type NavItem = { to: string; label: string; end?: boolean };

export type NavGroup = { key: string; label: string; items: NavItem[] };

/** Группы пунктов меню: меньше элементов в ряд, подпункты в выпадашке на десктопе. */
export function getVisibleNavGroups(me: MeUser | null): NavGroup[] {
  const role = me?.role.name;
  const groups: NavGroup[] = [
    {
      key: "clinic",
      label: "Клиника",
      items: [
        { to: "/", label: "Главная", end: true },
        { to: "/services", label: "Услуги" },
        { to: "/contacts", label: "Контакты" },
      ],
    },
  ];

  if (me) {
    const care: NavItem[] = [];
    if (role === "client" || role === "admin") {
      care.push({ to: "/pets", label: "Питомцы" });
    }
    care.push({ to: "/appointments", label: "Записи" });
    care.push({ to: "/medical-records", label: "Медкарты" });
    groups.push({
      key: "care",
      label: "Запись и уход",
      items: care,
    });
  }

  if (role === "doctor" || role === "admin") {
    const staff: NavItem[] = [
      { to: "/doctor", label: "Врачам" },
      { to: "/reports", label: "Отчёты" },
    ];
    if (role === "admin") {
      staff.push({ to: "/admin/users", label: "Пользователи" });
    }
    groups.push({
      key: "staff",
      label: "Персонал",
      items: staff,
    });
  }

  return groups;
}

/** Совпадение пути с пунктом (учёт `end` как у NavLink). */
export function navItemMatchesPath(pathname: string, item: NavItem): boolean {
  if (item.end) {
    return pathname === item.to;
  }
  if (pathname === item.to) return true;
  return pathname.startsWith(`${item.to}/`);
}

export function navGroupHasActiveItem(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => navItemMatchesPath(pathname, item));
}
