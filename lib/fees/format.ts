/** ৳4,500 — whole taka with Bangladeshi digit grouping. Safe to use in server and client components. */
export const taka = (n: number) => `৳${n.toLocaleString("en-IN")}`;

export const METHOD_LABELS = { cash: "Cash", bkash: "bKash", nagad: "Nagad", rocket: "Rocket", bank: "Bank" } as const;
