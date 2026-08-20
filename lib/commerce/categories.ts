export type CatalogCategory = {
  id: string;
  slug: string;
  displayName: string;
  aliases: string[];
};

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { id: "electric-guitars", slug: "electric-guitars", displayName: "Электрогитары", aliases: ["электрогитары", "электрогитара"] },
  { id: "acoustic-guitars", slug: "acoustic-guitars", displayName: "Акустические", aliases: ["акустические", "акустические гитары"] },
  { id: "classical-guitars", slug: "classical-guitars", displayName: "Классические", aliases: ["классические", "классические гитары"] },
  { id: "ukuleles", slug: "ukuleles", displayName: "Укулеле", aliases: ["укулеле"] },
  { id: "strings", slug: "strings", displayName: "Струны", aliases: ["струны"] },
  { id: "accessories", slug: "accessories", displayName: "Аксессуары", aliases: ["аксессуары"] },
  { id: "equipment", slug: "equipment", displayName: "Оборудование", aliases: ["оборудование"] },
];

const fallbackCategory = (displayName: string): CatalogCategory => {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "other";
  return { id: slug, slug, displayName, aliases: [displayName.toLowerCase()] };
};

export function categoryFromSource(value: string): CatalogCategory {
  const normalized = value.trim().toLowerCase();
  return CATALOG_CATEGORIES.find((category) =>
    category.slug === normalized || category.id === normalized || category.aliases.includes(normalized),
  ) ?? fallbackCategory(value || "Другое");
}

export const categoryBySlug = (slug: string) =>
  CATALOG_CATEGORIES.find((category) => category.slug === slug);

export const isCanonicalCategorySlug = (slug: string) => Boolean(categoryBySlug(slug));

