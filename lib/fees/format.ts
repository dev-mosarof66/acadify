/** ৳4,500 — whole taka with Bangladeshi digit grouping. Safe to use in server and client components. */
export const taka = (n: number) => `৳${n.toLocaleString("en-IN")}`;
