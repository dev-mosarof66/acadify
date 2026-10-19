# 7. অসীম ধারা

Source: Higher Math Bangla Version, printed pp. 136-145

## 7.1 অসীম ধারা (Infinite Series)

<!-- higher-math-9-10-bn-c07-t7.1-p001 · text · p.136 -->
নবম-দশম শ্রেণির গণিতে অনুক্রম ও সসীম ধারা সম্পর্কে বিস্তৃত আলোচনা করা হয়েছে। অনুক্রম ও অসীম ধারার মধ্যে একটা প্রত্যক্ষ সম্পর্ক রয়েছে। অনুক্রমের পদগুলোর পূর্বে যোগ চিহ্ন যুক্ত করে অসীম ধারা পাওয়া যায়। এ অধ্যায়ে অসীম ধারা নিয়ে আলোচনা করা হবে।

<!-- higher-math-9-10-bn-c07-t7.1-p002 · text · p.136 -->
এই অধ্যায় শেষে শিক্ষার্থীরা -

<!-- higher-math-9-10-bn-c07-t7.1-p003 · text · p.136 -->
* ▶ অনুক্রমের ধারণা ব্যাখ্যা করতে পারবে;
* ▶ অসীম ধারা চিহ্নিত করতে পারবে;
* ▶ অসীম গুণোত্তর ধারার সমষ্টি থাকার শর্ত ব্যাখ্যা করতে পারবে;
* ▶ অসীম গুণোত্তর ধারার সমষ্টি নির্ণয় করতে পারবে;
* ▶ আবৃত দশমিক সংখ্যাকে অনন্ত গুণোত্তর ধারায় প্রকাশ এবং সাধারণ ভগ্নাংশে রূপান্তর করতে পারবে।

### অনুক্রম

<!-- higher-math-9-10-bn-c07-t7.1-p004 · text · p.136 · review: verify-formula -->
নিচে দেখানো সম্পর্কটিতে প্রত্যেক স্বাভাবিক সংখ্যা $n$ এর সঙ্গে $n$ এর বর্গ $n^2$ সম্পর্কিত। অর্থাৎ স্বাভাবিক সংখ্যার সেট $N = \{1, 2, 3, 4, \dots\}$ থেকে একটি নিয়মের মাধ্যমে তার বর্গসংখ্যার সেট $\{1, 4, 9, 16, \dots\}$ পাওয়া যায়। এই সাজানো বর্গসংখ্যার সেটটি একটি অনুক্রম। যখন কতকগুলো রাশি একটা বিশেষ নিয়মে ক্রমাবয়ে এমনভাবে সাজানো হয় যে প্রত্যেক রাশি তার পূর্বে ও পরের রাশির সাথে কীভাবে সম্পর্কিত তা জানা যায়, তখন এভাবে সাজানো রাশিগুলোর সেটকে অনুক্রম (Sequence) বলা হয়।

<!-- higher-math-9-10-bn-c07-t7.1-p005 · table · p.136 · review: verify-table -->
<table><tr><td>1</td><td>2</td><td>3</td><td>4</td><td>...</td><td><em>n</em></td><td>...</td></tr>
<tr><td>↓</td><td>↓</td><td>↓</td><td>↓</td><td></td><td>↓</td><td></td></tr>
<tr><td>1</td><td>4</td><td>9</td><td>16</td><td>...</td><td><em>n</em><sup>2</sup></td><td>...</td></tr></table>

<!-- higher-math-9-10-bn-c07-t7.1-p006 · text · p.136 · review: verify-formula -->
উপরের সম্পর্কটিকে ফাংশন বলা হয় এবং $f(n) = n^2$ লেখা হয়। এই অনুক্রমের সাধারণ পদ $n^2$। যেকোনো অনুক্রমের পদসংখ্যা অসীম। অনুক্রমটি সাধারণ পদের সাহায্যে লেখার পদ্ধতি হলো $\{n^2\}, n = 1, 2, 3, 4, \dots$ বা, $\{n^2\}_{n=1}^{+\infty}$ বা কেবলই, $\{n^2\}$। কোনো অনুক্রমের প্রথম রাশিকে প্রথম পদ, দ্বিতীয় রাশিকে দ্বিতীয় পদ, তৃতীয় রাশিকে তৃতীয় পদ, ইত্যাদি বলা হয়। উপরে বর্ণিত $1, 4, 9, 16, \dots$ অনুক্রমের প্রথম পদ = 1, দ্বিতীয় পদ = 4, ইত্যাদি। নিচে অনুক্রমের আরও চারটি উদাহরণ দেওয়া হলো:

<!-- higher-math-9-10-bn-c07-t7.1-p007 · text · p.137 · review: verify-formula -->
ক) $\frac{1}{2}, \frac{1}{2^2}, \frac{1}{2^3}, \frac{1}{2^4}, \dots, \frac{1}{2^n}, \dots$

<!-- higher-math-9-10-bn-c07-t7.1-p008 · text · p.137 · review: verify-formula -->
খ) $3, 1, -1, -3, \dots, (5 - 2n), \dots$

<!-- higher-math-9-10-bn-c07-t7.1-p009 · text · p.137 · review: verify-formula -->
গ) $1, \frac{2}{3}, \frac{3}{5}, \frac{4}{7}, \dots, \frac{n}{2n - 1}, \dots$

<!-- higher-math-9-10-bn-c07-t7.1-p010 · text · p.137 · review: verify-formula -->
ঘ) $\frac{1}{2}, \frac{1}{5}, \frac{1}{10}, \frac{1}{17}, \dots, \frac{1}{n^2 + 1}, \dots$

<!-- higher-math-9-10-bn-c07-t7.1-p011 · text · p.137 -->
**কাজ:**

<!-- higher-math-9-10-bn-c07-t7.1-p012 · text · p.137 -->
ক) নিচের অনুক্রমগুলোর সাধারণ পদ নির্ণয় করো:

<!-- higher-math-9-10-bn-c07-t7.1-p013 · text · p.137 · review: verify-formula -->
(১) $\frac{1}{2}, -\frac{2}{3}, \frac{3}{4}, -\frac{4}{5}, \dots$ (২) $\frac{1}{2}, \frac{3}{4}, \frac{5}{6}, \frac{7}{8}, \dots$

<!-- higher-math-9-10-bn-c07-t7.1-p014 · text · p.137 · review: verify-formula -->
(৩) $\frac{1}{2}, \frac{1}{2}, \frac{3}{2^3}, \frac{4}{2^4}, \dots$ (৪) $1, \sqrt{2}, \sqrt{3}, 2, \dots$

<!-- higher-math-9-10-bn-c07-t7.1-p015 · text · p.137 -->
খ) প্রদত্ত সাধারণ পদ হতে অনুক্রমগুলো লেখো:

<!-- higher-math-9-10-bn-c07-t7.1-p016 · text · p.137 · review: verify-formula -->
(১) $1 + (-1)^n$ (২) $1 - (-1)^n$ (৩) $1 + \left(-\frac{1}{2}\right)^n$

<!-- higher-math-9-10-bn-c07-t7.1-p017 · text · p.137 · review: verify-formula -->
(৪) $\frac{n^2}{\sqrt[n]{\pi}}$ (৫) $\frac{\ln n}{n}$ (৬) $\cos \left(\frac{n\pi}{2}\right)$

<!-- higher-math-9-10-bn-c07-t7.1-p018 · text · p.137 · review: known-confusable-corrected -->
গ) তোমরা প্রত্যেকে একটি করে কোন অনুক্রমের সাধারণ পদ লিখে তারপর অনুক্রমটি লেখো।

## 7.2 ধারা

<!-- higher-math-9-10-bn-c07-t7.2-p001 · text · p.137 · review: verify-formula -->
কোনো অনুক্রমের পদগুলো পরপর যোগ চিহ্ন দ্বারা যুক্ত করলে একটি ধারা (series) পাওয়া যায়। যেমন, $1 + 4 + 9 + 16 + \dots$ একটি ধারা। আবার $\frac{1}{2} + \frac{1}{4} + \frac{1}{8} + \frac{1}{16} + \dots$ আরেকটি ধারা। এই পরের ধারাটির পরপর দুটি পদের অনুপাত সমান। এ রকম ধারাকে বলা হয় গুণোত্তর ধারা। যেকোনো ধারার পরপর দুটি পদের মধ্যে সম্পর্কের উপর নির্ভর করে ওই ধারাটির বৈশিষ্ট্য। যেমন সমানতর ধারার ক্ষেত্রে পরপর দুটি পদের অন্তর বা বিয়োগফল সমান হয়।

<!-- higher-math-9-10-bn-c07-t7.2-p002 · text · p.137 -->
কোনো ধারার পদের সংখ্যার উপর নির্ভর করে ধারাকে নিম্নোক্ত দুইভাবে ভাগ করা যায়। ক) সসীম বা সান্ত ধারা (Finite series) খ) অসীম বা অনন্ত ধারা (Infinite series)। সসীম ধারা সম্পর্কে নবম-দশম শ্রেণির গণিতে আলোচনা করা হয়েছে। এখানে অসীম ধারা সম্পর্কে আলোচনা করা হবে।

## 7.3 অসীম ধারা (Infinite Series)

<!-- higher-math-9-10-bn-c07-t7.3-p001 · text · p.137 · review: verify-formula -->
বাস্তব সংখ্যার একটি অনুক্রম $u_1, u_2, u_3, \dots, u_n, \dots$ হলে $u_1 + u_2 + u_3 + \dots + u_n + \dots$ কে বাস্তব সংখ্যার একটি অসীম ধারা বলা হয়। এই ধারাটির $n$ তম পদ $u_n$।

## 7.4 অসীম ধারার আংশিক সমষ্টি (Partial Sum of Infinite Series)

<!-- higher-math-9-10-bn-c07-t7.4-p001 · text · p.137 · review: verify-formula -->
$u_1 + u_2 + u_3 + \dots + u_n + \dots$ অনন্ত ধারার ১ম আংশিক সমষ্টি $S_1 = u_1$

<!-- higher-math-9-10-bn-c07-t7.4-p002 · text · p.138 · review: verify-formula -->
২য় আংশিক সমষ্টি $S_2 = u_1 + u_2$

<!-- higher-math-9-10-bn-c07-t7.4-p003 · text · p.138 · review: verify-formula -->
৩য় আংশিক সমষ্টি $S_3 = u_1 + u_2 + u_3$

<!-- higher-math-9-10-bn-c07-t7.4-p004 · text · p.138 · review: verify-formula -->
$\therefore n$ তম আংশিক সমষ্টি $S_n = u_1 + u_2 + u_3 + \dots + u_n$

<!-- higher-math-9-10-bn-c07-t7.4-p005 · text · p.138 · review: verify-formula -->
অর্থাৎ, কোনো অসীম ধারার $n$ তম আংশিক সমষ্টি হচ্ছে ধারাটির প্রথম $n$ সংখ্যক পদের সমষ্টি।

<!-- higher-math-9-10-bn-c07-t7.4-p006 · text · p.138 -->
**উদাহরণ ১.** প্রদত্ত অসীম ধারা দুটির আংশিক সমষ্টি নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.4-p007 · text · p.138 · review: verify-formula -->
ক) $1 + 2 + 3 + 4 + \dots$ খ) $1 - 1 + 1 - 1 + \dots$

### সমাধান:

<!-- higher-math-9-10-bn-c07-t7.4-p008 · text · p.138 · review: verify-formula -->
ক) ধারাটি একটি সমানতর ধারা কারণ ধারাটির প্রথম পদ $a = 1$ এবং সাধারণ অন্তর $d = 1$।
সমানতর ধারার প্রথম $n$ সংখ্যক পদের সমষ্টি $S_n = \frac{n}{2} \{2a + (n-1)d\} = \frac{n}{2} \{2 \cdot 1 + (n-1) \cdot 1\}$
কাজেই $S_n = \frac{n}{2} \{2 + n - 1\} = \frac{n(n+1)}{2}$

<!-- higher-math-9-10-bn-c07-t7.4-p009 · text · p.138 · review: verify-formula -->
উপরের সূত্রে $n$ এর বিভিন্ন মান বসিয়ে পাই,

<!-- higher-math-9-10-bn-c07-t7.4-p010 · formula · p.138 · review: verify-formula -->
$$S_{10} = \frac{10 \times 11}{2} = 55 \qquad S_{1000} = \frac{1000 \times 1001}{2} = 500500$$

<!-- higher-math-9-10-bn-c07-t7.4-p011 · formula · p.138 · review: verify-formula -->
$$S_{100000} = \frac{100000 \times 100001}{2} = 5000050000$$

<!-- higher-math-9-10-bn-c07-t7.4-p012 · text · p.138 · review: verify-formula -->
এভাবে, $n$ এর মান যত বড় করা হয়, $S_n$ এর মান তত বড় হয়।
সুতরাং প্রদত্ত অসীম ধারাটির কোনো সমষ্টি নাই।

<!-- higher-math-9-10-bn-c07-t7.4-p013 · text · p.138 · review: verify-formula -->
খ) $1 - 1 + 1 - 1 + \dots$ অসীম ধারাটির

<!-- higher-math-9-10-bn-c07-t7.4-p014 · table · p.138 · review: verify-formula,verify-table -->
<table><tr><td>১ম আংশিক সমষ্টি $S_1 = 1$</td><td>৩য় আংশিক সমষ্টি $S_3 = 1 - 1 + 1 = 1$</td></tr>
<tr><td>২য় আংশিক সমষ্টি $S_2 = 1 - 1 = 0$</td><td>৪র্থ আংশিক সমষ্টি $S_4 = 1 - 1 + 1 - 1 = 0$</td></tr></table>

<!-- higher-math-9-10-bn-c07-t7.4-p015 · text · p.138 · review: verify-formula -->
উপরের উদাহরণ থেকে দেখা যায় যে, $n$ বিজোড় সংখ্যা হলে $n$ তম আংশিক সমষ্টি $S_n = 1$ এবং $n$ জোড় সংখ্যা হলে $n$ তম আংশিক সমষ্টি $S_n = 0$।

<!-- higher-math-9-10-bn-c07-t7.4-p016 · text · p.138 -->
তাহলে দেখা যাচ্ছে যে, প্রদত্ত ধারাটির ক্ষেত্রে, এমন কোনো নির্দিষ্ট সংখ্যা পাওয়া যায় না যাকে ধারাটির সমষ্টি বলা যায়।

## 7.5 অসীম গুণোত্তর ধারার সমষ্টি (Sum of Infinite Geometric Series)

<!-- higher-math-9-10-bn-c07-t7.5-p001 · text · p.138 · review: verify-formula -->
$a + ar + ar^2 + ar^3 + \dots$ গুণোত্তর ধারাটির প্রথম পদ $a$ এবং সাধারণ অনুপাত $r$।

<!-- higher-math-9-10-bn-c07-t7.5-p002 · text · p.139 · review: verify-formula -->
সুতরাং, ধারাটির $n$ তম পদ $= ar^{n-1}$, যেখানে $n \in N$।

<!-- higher-math-9-10-bn-c07-t7.5-p003 · text · p.139 · review: verify-formula -->
এবার, $r \neq 1$ হলে ধারাটির $n$ তম আংশিক সমষ্টি

<!-- higher-math-9-10-bn-c07-t7.5-p004 · formula · p.139 · review: verify-formula -->
$$S_n = a + ar + ar^2 + ar^3 + \dots + ar^{n-1}$$

<!-- higher-math-9-10-bn-c07-t7.5-p005 · formula · p.139 · review: latin-junk,verify-formula -->
$$S_n = a \cdot \frac{r^n - 1}{r - 1} \quad যখন  r > 1  এবং  S_n = a \cdot \frac{1 - r^n}{1 - r}, \quad যখন  r < 1$$

<!-- higher-math-9-10-bn-c07-t7.5-p006 · text · p.139 -->
**লক্ষ্য করি:**

<!-- higher-math-9-10-bn-c07-t7.5-p007 · text · p.139 · review: verify-formula -->
ক) $|r| < 1$ হলে, অর্থাৎ, $-1 < r < 1$ হলে, $n$ এর মান বৃদ্ধি করলে ($n \to \infty$ হলে) $|r^n|$ এর মান হ্রাস পায় এবং $n$ এর মান যথেষ্ট বড়ো করলে $|r^n|$ এর মান ০ এর কাছাকাছি হয়। অর্থাৎ $|r^n|$ এর প্রান্তীয় মান (Limiting value) ০ হয়।

<!-- higher-math-9-10-bn-c07-t7.5-p008 · text · p.139 · review: verify-formula -->
ফলে $S_n$ এর প্রান্তীয় মান $S_n = \frac{a(1 - r^n)}{1 - r} = \frac{a}{1 - r} - \frac{ar^n}{1 - r} = \frac{a}{1 - r}$

<!-- higher-math-9-10-bn-c07-t7.5-p009 · text · p.139 · review: verify-formula -->
এক্ষেত্রে, অসীম ধারাটির সমষ্টি $S_\infty = \frac{a}{1 - r}$

<!-- higher-math-9-10-bn-c07-t7.5-p010 · text · p.139 · review: verify-formula -->
খ) $|r| > 1$ হলে, অর্থাৎ $r > 1$ অথবা $r < -1$ হলে, $n$ এর মান বৃদ্ধি করলে $|r^n|$ এর মান বৃদ্ধি পায় এবং $n$ কে যথেষ্ট বড়ো করে $|r^n|$ এর মান যথেষ্ট বড়ো করা যায়। সুতরাং এমন কোন নির্দিষ্ট সংখ্যা $S$ পাওয়া যায় না, যাকে $S_n$ এর প্রান্তীয় মান ধরা যায়।

<!-- higher-math-9-10-bn-c07-t7.5-p011 · text · p.139 -->
অর্থাৎ, এক্ষেত্রে অসীম ধারাটির কোনো সমষ্টি নেই।

<!-- higher-math-9-10-bn-c07-t7.5-p012 · text · p.139 · review: verify-formula -->
গ) $r = -1$ হলে, $S_n$ এর প্রান্তীয় মান পাওয়া যায় না। কেননা, $n$ জোড় সংখ্যা হলে $(-1)^n = 1$ এবং $n$ বিজোড় সংখ্যা হলে $(-1)^n = -1$। এক্ষেত্রে ধারাটি হবে, $a - a + a - a + a - a + \dots$।

<!-- higher-math-9-10-bn-c07-t7.5-p013 · text · p.139 -->
সুতরাং, এই অসীম ধারাটির কোনো সমষ্টি নেই।

<!-- higher-math-9-10-bn-c07-t7.5-p014 · text · p.139 · review: verify-formula -->
ঘ) $r = 1$ হলেও $S_n$ এর প্রান্তীয় মান পাওয়া যায় না। কেননা তখন ধারাটি হবে $a + a + a + a + \dots$ ($n$ সংখ্যক)। অর্থাৎ $S_n = na$ যা $n$ এর মান বাড়িয়ে যথেষ্ট বড় করা যায়।

<!-- higher-math-9-10-bn-c07-t7.5-p015 · text · p.139 -->
সুতরাং, এই অসীম ধারাটির কোনো সমষ্টি নেই।

<!-- higher-math-9-10-bn-c07-t7.5-p016 · text · p.139 · review: verify-formula -->
> $|r| < 1$ অর্থাৎ, $-1 < r < 1$ হলে, $a + ar + ar^2 + \dots$ অসীম গুণোত্তর ধারাটির সমষ্টি $S = \frac{a}{1 - r}$। $r$ এর অন্য সকল মানের জন্য অসীম ধারাটির সমষ্টি থাকবে না।

<!-- higher-math-9-10-bn-c07-t7.5-p017 · text · p.139 · review: verify-formula -->
**মন্তব্য:** অসীম গুণোত্তর ধারার সমষ্টিকে (যদি থাকে) $S_\infty$ লিখে প্রকাশ করা হয় এবং একে ধারাটির অসীমতক সমষ্টি বলা হয়। অর্থাৎ, $a + ar + ar^2 + ar^3 + \dots$ গুণোত্তর ধারাটির অসীমতক সমষ্টি, $S_\infty = \frac{a}{1 - r}$, যখন $|r| < 1$।

### কাজ:

<!-- higher-math-9-10-bn-c07-t7.5-p018 · text · p.140 · review: verify-formula -->
ক) নিচের প্রত্যেক ক্ষেত্রে একটি অসীম গুণোত্তর ধারার প্রথম পদ $a$ এবং সাধারণ অনুপাত $r$ দেওয়া আছে। ধারাটি লিখ এবং যদি এর অসীমতক সমষ্টি থাকে তাহাও নির্ণয় করো:

<!-- higher-math-9-10-bn-c07-t7.5-p019 · text · p.140 · review: verify-formula -->
(১) $a = 4, r = \frac{1}{2}$ (২) $a = 2, r = -\frac{1}{3}$ (৩) $a = \frac{1}{3}, r = 3$

<!-- higher-math-9-10-bn-c07-t7.5-p020 · text · p.140 · review: verify-formula -->
(৪) $a = 5, r = \frac{1}{10^2}$ (৫) $a = 1, r = -\frac{2}{7}$ (৬) $a = 81, r = -\frac{1}{3}$

<!-- higher-math-9-10-bn-c07-t7.5-p021 · text · p.140 -->
খ) তোমরা প্রত্যেকে একটি করে অসীম গুণোত্তর ধারা লেখো।

<!-- higher-math-9-10-bn-c07-t7.5-p022 · text · p.140 -->
**উদাহরণ ২.** নিচের অসীম গুণোত্তর ধারার অসীমতক সমষ্টি (যদি থাকে) নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.5-p023 · text · p.140 · review: verify-formula -->
ক) $\frac{1}{3} + \frac{1}{3^2} + \frac{1}{3^3} + \frac{1}{3^4} + \dots$

<!-- higher-math-9-10-bn-c07-t7.5-p024 · text · p.140 · review: verify-formula -->
খ) $1 + 0.1 + 0.01 + 0.001 + \dots$

<!-- higher-math-9-10-bn-c07-t7.5-p025 · text · p.140 · review: verify-formula -->
গ) $1 + \frac{1}{\sqrt{2}} + \frac{1}{2} + \frac{1}{2\sqrt{2}} + \frac{1}{4} + \dots$

### সমাধান:

<!-- higher-math-9-10-bn-c07-t7.5-p026 · text · p.140 · review: verify-formula -->
ক) এখানে, ধারাটির প্রথম পদ, $a = \frac{1}{3}$ এবং সাধারণ অনুপাত $r = \frac{1}{3^2} \times \frac{3}{1} = \frac{1}{3} < 1$

<!-- higher-math-9-10-bn-c07-t7.5-p027 · text · p.140 · review: verify-formula -->
$\therefore$ ধারাটির অসীমতক সমষ্টি, $S_\infty = \frac{a}{1 - r} = \frac{\frac{1}{3}}{1 - \frac{1}{3}} = \frac{1}{3} \times \frac{3}{2} = \frac{1}{2}$

<!-- higher-math-9-10-bn-c07-t7.5-p028 · text · p.140 · review: verify-formula -->
খ) এখানে, ধারাটির প্রথম পদ $a = 1$ এবং সাধারণ অনুপাত $r = \frac{0.1}{1} = \frac{1}{10} < 1$

<!-- higher-math-9-10-bn-c07-t7.5-p029 · text · p.140 · review: verify-formula -->
$\therefore$ ধারাটির অসীমতক সমষ্টি, $S_\infty = \frac{a}{1 - r} = \frac{1}{1 - \frac{1}{10}} = \frac{10}{9} = 1\frac{1}{9}$

<!-- higher-math-9-10-bn-c07-t7.5-p030 · text · p.140 · review: verify-formula -->
গ) এখানে, ধারাটির প্রথম পদ $a = 1$ এবং সাধারণ অনুপাত $r = \frac{\frac{1}{\sqrt{2}}}{1} = \frac{1}{\sqrt{2}} < 1$

<!-- higher-math-9-10-bn-c07-t7.5-p031 · text · p.140 · review: verify-formula -->
$\therefore$ ধারাটির অসীমতক সমষ্টি, $S_\infty = \frac{a}{1 - r} = \frac{1}{1 - \frac{1}{\sqrt{2}}} = \frac{\sqrt{2}}{\sqrt{2} - 1} = 3.414$ (আসন্ন)

## 7.6 পৌনঃপুনিক দশমিকের সাধারণ ভগ্নাংশে রূপান্তর

<!-- higher-math-9-10-bn-c07-t7.6-p001 · text · p.140 -->
**উদাহরণ ৩.** নিম্নের পৌনঃপুনিক দশমিক সংখ্যাসমূহকে সাধারণ ভগ্নাংশে রূপান্তর করো:

<!-- higher-math-9-10-bn-c07-t7.6-p002 · text · p.140 · review: verify-formula -->
ক) $0.\dot{5}$ খ) $0.\dot{1}\dot{2}$ গ) $1.\dot{2}\dot{3}\dot{1}$

### সমাধান:

<!-- higher-math-9-10-bn-c07-t7.6-p003 · text · p.141 · review: verify-formula -->
ক) $0.\dot{5} = 0.555 \dots = 0.5 + 0.05 + 0.005 + \dots$

<!-- higher-math-9-10-bn-c07-t7.6-p004 · text · p.141 · review: verify-formula -->
এই অসীম গুণোত্তর ধারারটির ১ম পদ $a = 0.5$ এবং সাধারণ অনুপাত $r = \frac{0.05}{0.5} = 0.1$

<!-- higher-math-9-10-bn-c07-t7.6-p005 · formula · p.141 · review: verify-formula -->
$\therefore 0.\dot{5} = \frac{a}{1 - r} = \frac{0.5}{1 - (0.1)} = \frac{0.5}{0.9} = \frac{5}{9}$

<!-- higher-math-9-10-bn-c07-t7.6-p006 · text · p.141 · review: verify-formula -->
খ) $0.\dot{1}\dot{2} = 0.12121212 \dots = 0.12 + 0.0012 + 0.000012 + \dots$

<!-- higher-math-9-10-bn-c07-t7.6-p007 · text · p.141 · review: verify-formula -->
এই অসীম গুণোত্তর ধারারটির ১ম পদ $a = 0.12$ এবং সাধারণ অনুপাত $r = \frac{0.0012}{0.12} = 0.01$

<!-- higher-math-9-10-bn-c07-t7.6-p008 · formula · p.141 · review: verify-formula -->
$\therefore 0.\dot{1}\dot{2} = \frac{a}{1 - r} = \frac{0.12}{1 - (0.01)} = \frac{0.12}{0.99} = \frac{4}{33}$

<!-- higher-math-9-10-bn-c07-t7.6-p009 · text · p.141 · review: verify-formula -->
গ) $1.\dot{23}\dot{1} = 1.231231231 \dots = 1 + (0.231 + 0.000231 + 0.000000231 + \dots)$

<!-- higher-math-9-10-bn-c07-t7.6-p010 · text · p.141 -->
এখানে, বন্ধনীর ভিতরের অংশটি একটি অসীম গুণোত্তর ধারা।

<!-- higher-math-9-10-bn-c07-t7.6-p011 · text · p.141 · review: verify-formula -->
আর সেই গুণোত্তর ধারার ১ম পদ $a = 0.231$ এবং সাধারণ অনুপাত $r = \frac{0.000231}{0.231} = 0.001$

<!-- higher-math-9-10-bn-c07-t7.6-p012 · formula · p.141 · review: verify-formula -->
$\therefore 1.\dot{23}\dot{1} = 1 + \frac{a}{1 - r} = 1 + \frac{0.231}{1 - (0.001)} = 1 + \frac{231}{999} = \frac{410}{333}$

<!-- higher-math-9-10-bn-c07-t7.6-p013 · text · p.141 · review: verify-formula -->
**উদাহরণ ৪.** $\frac{1}{2x + 1} + \frac{1}{(2x + 1)^2} + \frac{1}{(2x + 1)^3} + \dots$ একটি অনন্ত গুণোত্তর ধারা।

<!-- higher-math-9-10-bn-c07-t7.6-p014 · text · p.141 · review: verify-formula -->
ক) $x = 1$ হলে, ধারারটির সাধারণ অনুপাত নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.6-p015 · text · p.141 · review: verify-formula -->
খ) $x = \frac{3}{2}$ হলে, ধারারটির পঞ্চম পদ এবং প্রথম 10 পদের সমষ্টি নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.6-p016 · text · p.141 · review: verify-formula -->
গ) $x$ এর উপর কী শর্ত আরোপ করলে ধারারটির অসীমতক সমষ্টি থাকবে এবং সেই সমষ্টি নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.6-p017 · text · p.141 · review: verify-formula -->
ক) দেওয়া আছে, $\frac{1}{2x + 1} + \frac{1}{(2x + 1)^2} + \frac{1}{(2x + 1)^3} + \dots$ একটি অনন্ত গুণোত্তর ধারা।

<!-- higher-math-9-10-bn-c07-t7.6-p018 · text · p.141 · review: verify-formula -->
$x = 1$ হলে, ধারাটি $= \frac{1}{2 \cdot 1 + 1} + \frac{1}{(2 \cdot 1 + 1)^2} + \frac{1}{(2 \cdot 1 + 1)^3} + \dots$

<!-- higher-math-9-10-bn-c07-t7.6-p019 · formula · p.141 · review: verify-formula -->
$$= \frac{1}{3} + \frac{1}{3^2} + \frac{1}{3^3} + \dots$$

<!-- higher-math-9-10-bn-c07-t7.6-p020 · text · p.141 · review: verify-formula -->
ধারারটির সাধারণ অনুপাত, $r = \frac{\frac{1}{3^2}}{\frac{1}{3}} = \frac{1}{3}$ খ) দেওয়া আছে, $\frac{1}{2x+1} + \frac{1}{(2x+1)^2} + \frac{1}{(2x+1)^3} + \dots$

<!-- higher-math-9-10-bn-c07-t7.6-p021 · text · p.142 · review: verify-formula -->
$x = \frac{3}{2}$ হলে, ধারাটি $= \frac{1}{2 \cdot \frac{3}{2} + 1} + \frac{1}{(2 \cdot \frac{3}{2} + 1)^2} + \frac{1}{(2 \cdot \frac{3}{2} + 1)^3} + \dots$

<!-- higher-math-9-10-bn-c07-t7.6-p022 · formula · p.142 · review: verify-formula -->
$= \frac{1}{4} + \frac{1}{4^2} + \frac{1}{4^3} + \dots$

<!-- higher-math-9-10-bn-c07-t7.6-p023 · text · p.142 · review: verify-formula -->
ধারাটির প্রথম পদ, $a = \frac{1}{4}$; সাধারণ অনুপাত, $r = \frac{\frac{1}{4^2}}{\frac{1}{4}} = \frac{1}{4} < 1$

<!-- higher-math-9-10-bn-c07-t7.6-p024 · text · p.142 · review: verify-formula -->
$\therefore$ ধারাটির পঞ্চম পদ $= ar^{5-1} = \frac{1}{4} \cdot \left(\frac{1}{4}\right)^{5-1} = \left(\frac{1}{4}\right)^5 = \frac{1}{4^5}$

<!-- higher-math-9-10-bn-c07-t7.6-p025 · text · p.142 · review: verify-formula -->
ধারাটির প্রথম দশ পদের সমষ্টি $= \frac{a(1 - r^n)}{1 - r} \quad [n = 10]$

<!-- higher-math-9-10-bn-c07-t7.6-p026 · formula · p.142 · review: verify-formula -->
$= \frac{\frac{1}{4} \left\{ 1 - \left(\frac{1}{4}\right)^{10} \right\}}{1 - \frac{1}{4}} = \frac{\frac{1}{4} \left( 1 - \frac{1}{4^{10}} \right)}{\frac{3}{4}} = \frac{1}{4} \times \frac{4}{3} \left( 1 - \frac{1}{4^{10}} \right) = \frac{1}{3} \left( 1 - \frac{1}{4^{10}} \right)$

<!-- higher-math-9-10-bn-c07-t7.6-p027 · text · p.142 · review: verify-formula -->
গ) ধারাটির প্রথম পদ, $a = \frac{1}{2x+1}$, সাধারণ অনুপাত, $r = \frac{\frac{1}{(2x+1)^2}}{\frac{1}{2x+1}} = \frac{1}{2x+1}$

<!-- higher-math-9-10-bn-c07-t7.6-p028 · text · p.142 · review: verify-formula -->
এখানে, $\frac{1}{2x+1} \neq 0$, অতএব, $\frac{1}{2x+1} > 0$ অথবা $\frac{1}{2x+1} < 0 \dots (1)$

<!-- higher-math-9-10-bn-c07-t7.6-p029 · text · p.142 · review: verify-formula -->
এবার ধারাটির অসীমতক সমষ্টি থাকবে যদি, $|r| < 1$ অর্থাৎ $\left| \frac{1}{2x+1} \right| < 1$ হয় $\dots (2)$

<!-- higher-math-9-10-bn-c07-t7.6-p030 · text · p.142 · review: verify-formula -->
যখন উপরের (1) এর শর্ত $\frac{1}{2x+1} > 0$ সত্য অর্থাৎ $2x+1 > 0$ [গুণোত্তর বিপরীতের চিহ্ন একই] তখন (2) এ সেটা বসিয়ে পাই $\frac{1}{2x+1} < 1$

<!-- higher-math-9-10-bn-c07-t7.6-p031 · text · p.142 · review: verify-formula -->
এবার উভয় পক্ষে ধনাত্মক সংখ্যা $2x+1$ দিয়ে গুণ করলে অসমতার চিহ্ন একই থাকবে

<!-- higher-math-9-10-bn-c07-t7.6-p032 · text · p.142 · review: verify-formula -->
অর্থাৎ $1 < 2x+1$, বা, $1-1 < 2x$, বা, $0 < 2x$, বা, $2x > 0$ বা, $x > 0$

<!-- higher-math-9-10-bn-c07-t7.6-p033 · text · p.142 · review: verify-formula -->
যখন উপরের (1) এর শর্ত $\frac{1}{2x+1} < 0$ সত্য অর্থাৎ $2x+1 < 0$ [গুণোত্তর বিপরীতের চিহ্ন একই] তখন (2) এ সেটা বসিয়ে পাই $-\frac{1}{2x+1} < 1$ এবার উভয় পক্ষে ঋণাত্মক সংখ্যা $2x + 1$ দিয়ে গুণ করলে অসমতার চিহ্ন বদলে যাবে

<!-- higher-math-9-10-bn-c07-t7.6-p034 · text · p.143 · review: verify-formula -->
অর্থাৎ $-1 > 2x + 1$, বা, $-1 - 1 > 2x$, বা, $-2 > 2x$, বা, $-1 > x$, বা, $x < -1$

<!-- higher-math-9-10-bn-c07-t7.6-p035 · text · p.143 · review: verify-formula -->
$\therefore$ নির্ণেয় শর্ত $x < -1$ অথবা, $x > 0$

<!-- higher-math-9-10-bn-c07-t7.6-p036 · text · p.143 · review: verify-formula -->
সুতরাং ধারাটির অসীমতক সমষ্টি $S_\infty = \frac{a}{1 - r} = \frac{\frac{1}{2x + 1}}{1 - \frac{1}{2x + 1}}$

<!-- higher-math-9-10-bn-c07-t7.6-p037 · text · p.143 · review: verify-formula -->
লব ও হরকে $(2x + 1)$ দ্বারা গুণ করে, $S_\infty = \frac{1}{2x + 1 - 1} = \frac{1}{2x}$

## 7.ex অনুশীলনী ৭

<!-- higher-math-9-10-bn-c07-t7.ex-p001 · exercise · p.143 -->
১. ১, ৩, ৫, ৭, ... অনুক্রমটির ১২তম পদ কোনটি?
ক) ১২ খ) ১৩ গ) ২৩ ঘ) ২৫

<!-- higher-math-9-10-bn-c07-t7.ex-p002 · exercise · p.143 · review: verify-formula -->
২. কোনো একটি অনুক্রমের $n$তম পদ $= \frac{1}{n(n + 1)}$ হলে এর তৃতীয় পদ কোনটি?
ক) $\frac{1}{3}$ খ) $\frac{1}{6}$ গ) $\frac{1}{12}$ ঘ) $\frac{1}{20}$

<!-- higher-math-9-10-bn-c07-t7.ex-p003 · exercise · p.143 · review: verify-formula -->
৩. কোনো একটি অনুক্রমের $n$তম পদ $u_n = 1 - (-1)^n$ হলে, এর
(i) ১০ তম পদ ০
(ii) ১৫ তম পদ ২
(iii) প্রথম ১২ পদের সমষ্টি ১২
নিচের কোনটি সঠিক?
ক) $i, ii$ খ) $i, iii$ গ) $ii, iii$ ঘ) $i, ii, iii$

<!-- higher-math-9-10-bn-c07-t7.ex-p004 · exercise · p.143 · review: verify-formula -->
৪. প্রদত্ত অনুক্রমের ১০ তম পদ, ১৫ তম পদ এবং $r$ তম পদ নির্ণয় করো:
ক) ২, ৪, ৬, ৮, ১০, ১২, ...
খ) অনুক্রমটির $n$ তম পদ $= \frac{1}{n(n + 1)}, n \in N$
গ) ০, ১, ০, ১, ০, ১, ...
ঘ) $5, \frac{5}{3}, \frac{5}{9}, \frac{5}{27}, \frac{5}{81}, \dots$
ঙ) অনুক্রমটির $n$ তম পদ $= \frac{1 - (-1)^{3n}}{2}$

<!-- higher-math-9-10-bn-c07-t7.ex-p005 · exercise · p.144 · review: verify-formula -->
৫. একটি অনুক্রমের $n$ তম পদ $u_n = \frac{1}{n}$

<!-- higher-math-9-10-bn-c07-t7.ex-p006 · exercise · p.144 · review: verify-formula -->
ক) $u_n < 10^{-5}$ হলে, $n$ এর মান কিরূপ হবে?

<!-- higher-math-9-10-bn-c07-t7.ex-p007 · exercise · p.144 · review: verify-formula -->
খ) $u_n > 10^{-5}$ হলে, $n$ এর মান কিরূপ হবে?

<!-- higher-math-9-10-bn-c07-t7.ex-p008 · exercise · p.144 · review: verify-formula -->
গ) $u_n$ এর প্রান্তীয় মান ($n$ যথেষ্ট বড় হলে) সম্পর্কে কী বলা যায়?

<!-- higher-math-9-10-bn-c07-t7.ex-p009 · exercise · p.144 -->
৬. প্রদত্ত অসীম গুণোত্তর ধারার (অসীমতক) সমষ্টি যদি থাকে, তবে তা নির্ণয় করো:

<!-- higher-math-9-10-bn-c07-t7.ex-p010 · exercise · p.144 · review: verify-formula -->
ক) $1 + \frac{1}{2} + \frac{1}{4} + \frac{1}{8} + \dots$

<!-- higher-math-9-10-bn-c07-t7.ex-p011 · exercise · p.144 · review: verify-formula -->
খ) $8 + 2 + \frac{1}{2} + \frac{1}{8} + \frac{1}{32} + \dots$

<!-- higher-math-9-10-bn-c07-t7.ex-p012 · exercise · p.144 · review: verify-formula -->
গ) $1 + 2 + 4 + 8 + 16 + \dots$

<!-- higher-math-9-10-bn-c07-t7.ex-p013 · exercise · p.144 · review: verify-formula -->
ঘ) $\frac{1}{2} + \left(-\frac{1}{4}\right) + \frac{1}{8} + \left(-\frac{1}{16}\right) + \dots$

<!-- higher-math-9-10-bn-c07-t7.ex-p014 · exercise · p.144 · review: verify-formula -->
৭. নিচের ধারাগুলোর প্রথম $n$ সংখ্যক পদের যোগফল নির্ণয় করো:

<!-- higher-math-9-10-bn-c07-t7.ex-p015 · exercise · p.144 · review: verify-formula -->
ক) $7 + 77 + 777 + \dots$

<!-- higher-math-9-10-bn-c07-t7.ex-p016 · exercise · p.144 · review: verify-formula -->
খ) $5 + 55 + 555 + \dots$

<!-- higher-math-9-10-bn-c07-t7.ex-p017 · exercise · p.144 · review: verify-formula -->
৮. $x$-এর উপর কী শর্ত আরোপ করলে $\frac{1}{x+1} + \frac{1}{(x+1)^2} + \frac{1}{(x+1)^3} + \dots$ অসীম ধারাটির (অসীমতক) সমষ্টি থাকবে এবং সেই সমষ্টি নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.ex-p018 · exercise · p.144 -->
৯. প্রদত্ত পৌনঃপুনিক দশমিকগুলোকে মূলদীয় ভগ্নাংশে প্রকাশ করো:

<!-- higher-math-9-10-bn-c07-t7.ex-p019 · exercise · p.144 · review: verify-formula -->
ক) $0.2\dot{7}$

<!-- higher-math-9-10-bn-c07-t7.ex-p020 · exercise · p.144 · review: verify-formula -->
খ) $0.0\dot{1}2\dot{3}$

<!-- higher-math-9-10-bn-c07-t7.ex-p021 · exercise · p.144 · review: verify-formula -->
গ) $3.0\dot{4}0\dot{3}$

<!-- higher-math-9-10-bn-c07-t7.ex-p022 · exercise · p.144 · review: verify-formula -->
১০. একটি গুণোত্তর ধারার তিনটি ক্রমিক পদের সমষ্টি $24\frac{4}{5}$ এবং গুণফল ৬৪।

<!-- higher-math-9-10-bn-c07-t7.ex-p023 · exercise · p.144 -->
ক) উদ্দিপকের আলোকে দুটি সমীকরণ গঠন করো।

<!-- higher-math-9-10-bn-c07-t7.ex-p024 · exercise · p.144 -->
খ) ধারাটির প্রথম পদ ও সাধারণ অনুপাত নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.ex-p025 · exercise · p.144 · review: verify-formula -->
গ) সাধারণ অনুপাত $\frac{1}{5}$ হলে ধারাটির অসীমতক সমষ্টি নির্ণয় করো।

<!-- higher-math-9-10-bn-c07-t7.ex-p026 · exercise · p.144 -->
১১. চারটি কুকুর এক কিলোমিটার বাহুবিশিষ্ট একটি বর্গক্ষেত্রের চার কোণায় দাঁড়িয়ে আছে। এবার প্রতিটি কুকুর একই বেগে সরাসরি ডানের কুকুরের দিকে চোখ বন্ধ করে অর্ধেক দূরত্ব অতিক্রম করে। চোখ খুলেই আবার ডানে অবস্থিত কুকুরের দিকে একইভাবে অর্ধেক দূরত্ব দৌড়ায়।

<!-- higher-math-9-10-bn-c07-t7.ex-p027 · exercise · p.144 -->
ক) এভাবে দৌড়াতে থাকলে পরিশেষে কুকুরগুলোর অবস্থান কী হবে? তারা প্রত্যেকে কত দূরত্বই বা অতিক্রম করবে?

<!-- higher-math-9-10-bn-c07-t7.ex-p028 · exercise · p.144 · review: verify-formula -->
খ) অর্ধেক দূরত্ব পর দিক পরিবর্তন না করে যদি $k$ ভাগের একভাগ অতিক্রম করে দিক পরিবর্তন করে তাহলে উপরের প্রশ্নের উত্তর দাও।

<!-- higher-math-9-10-bn-c07-t7.ex-p029 · exercise · p.144 -->
গ) ক্ষেত্রটি বর্গক্ষেত্র না হয়ে যদি সমবাহু ত্রিভুজ হতো তাহলে উপরের প্রশ্নগুলোর উত্তর দাও।

### বহুনির্বাচনি প্রশ্ন

<!-- higher-math-9-10-bn-c07-t7.ex-p030 · exercise · p.145 · review: verify-formula -->
১. কোনো একটি অনুক্রমের $n$তম পদ $= \frac{1 - (-1)^n}{2}$ হলে ২০তম পদ কোনটি?
ক) ০                      খ) ১                      গ) $-1$                      ঘ) ২

<!-- higher-math-9-10-bn-c07-t7.ex-p031 · exercise · p.145 · review: verify-formula -->
২. কোনো একটি অনুক্রমের $n$তম পদ $u_n = \frac{1}{n}$ এবং $u_n < 10^{-4}$ হলে $n$ এর মান হবে
(i) $n < 10^3$                      (ii) $n < 10^4$                      (iii) $n > 10^4$
নিচের কোনটি সঠিক?
ক) (iii)                      খ) (i), (iii)                      গ) (ii), (iii)                      ঘ) (i), (ii), (iii)

<!-- higher-math-9-10-bn-c07-t7.ex-p032 · exercise · p.145 · review: verify-formula -->
পাশ্চের ধারাটি লক্ষ্য করো এবং ৩ ও ৪ নম্বর প্রশ্নের উত্তর দাও। $4 + \frac{4}{3} + \frac{4}{9} + \dots$

<!-- higher-math-9-10-bn-c07-t7.ex-p033 · exercise · p.145 · review: verify-formula -->
৩. ধারাটির ১০ তম পদ কোনটি?
ক) $\frac{4}{3^{10}}$                      খ) $\frac{4}{3^9}$                      গ) $\frac{4}{3^{11}}$                      ঘ) $\frac{4}{3^{12}}$

<!-- higher-math-9-10-bn-c07-t7.ex-p034 · exercise · p.145 · review: verify-formula -->
৪. ধারাটির অসীমতক সমষ্টি কত?
ক) ৩                      খ) $\frac{28}{5}$                      গ) ৬                      ঘ) $\frac{59}{10}$

### সৃজনশীল প্রশ্ন

<!-- higher-math-9-10-bn-c07-t7.ex-p035 · exercise · p.145 · review: known-confusable-corrected,verify-formula -->
৫. $a + ab + ab^2 + \dots$ একটি গুণোত্তর ধারা।
ক) ধারাটির সপ্তম পদ নির্ণয় করো।
খ) $a = 1$ এবং $b = \frac{1}{2}$ হলে, ধারাটির অসীমতক সমষ্টি যদি থাকে তবে তা নির্ণয় করো।
গ) $a$ এর স্থানে ৩, $ab$ এর স্থানে ৩৩ এবং $ab^2$ এর স্থানে ৩৩৩ বসালে যে ধারা পাওয়া যায় তার প্রথম $n$ সংখ্যক পদের সমষ্টি নির্ণয় করো।

### সংক্ষিপ্ত-উত্তর প্রশ্ন

<!-- higher-math-9-10-bn-c07-t7.ex-p036 · exercise · p.145 · review: verify-formula -->
৬. ক) $\frac{1}{2}, 1, \frac{3}{2}, 2, \frac{5}{2}, \dots$ ধারাটির ১৫ তম পদ নির্ণয় করো।
খ) $\frac{1}{5} - \frac{2}{5^2} + \frac{4}{5^3} - \frac{8}{5^4} + \dots$ ধারাটির অসীমতক সমষ্টি নির্ণয় করো।
গ) $2.30\bar{5}$ সংখ্যাটিকে মূলদীয় ভগ্নাংশে প্রকাশ করো।

<!-- higher-math-9-10-bn-c07-t7.ex-p037 · exercise · p.145 · review: verify-formula -->
(ঘ) কোনো অনন্ত গুণোত্তর ধারার প্রথম পদ $\frac{1}{2}$ এবং অসীমতক সমষ্টি $\frac{1}{3}$ হলে, ধারাটির সাধারণ অনুপাত নির্ণয় করো।
