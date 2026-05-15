function normalizedTitle(post) {
  return String(post?.title || post?.post_title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function positionRank(post) {
  const title = normalizedTitle(post);

  if (/\b(hor|house of rep|house of representative|house of representatives)\b/.test(title)) return 10;
  if (title.includes("assistant director")) return 20;
  if (title.includes("director")) return 30;
  if (title.includes("provost")) return 40;
  if (title.includes("public relations officer 2") || /\bpro 2\b/.test(title)) return 50;
  if (title.includes("public relations officer 1") || /\bpro 1\b/.test(title)) return 60;
  if (title.includes("treasurer")) return 70;
  if (title.includes("financial secretary")) return 80;
  if (title.includes("secretary general")) return 90;
  if (title.includes("vice president")) return 100;
  if (title === "president" || /\bpresident\b/.test(title)) return 110;

  return 1000;
}

export function sortPostsByHierarchy(posts) {
  return [...posts].sort((a, b) => {
    const rankDiff = positionRank(a) - positionRank(b);
    if (rankDiff !== 0) return rankDiff;

    const orderDiff = Number(a.display_order || a.post_order || 0) - Number(b.display_order || b.post_order || 0);
    if (orderDiff !== 0) return orderDiff;

    return normalizedTitle(a).localeCompare(normalizedTitle(b));
  });
}
