import { Question, VerificationStatus } from '@/types';

export interface ProblemDetail {
  starterCode: string;
  starterCodeJava?: string;
  starterCodeCpp?: string;
  testCases: Array<{ input: string; expected: string; explanation?: string }>;
  description: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  constraints: string[];
  editorial: {
    approach: string;
    complexity: string;
  };
  referenceImplementation?: Function;
  sourceAttribution?: string;
  sourceUrl?: string;
  sourceLicense?: string;
  isApAuthored?: boolean;
  isCanonicalVerified?: boolean;
  verificationStatus?: VerificationStatus;
}

// -------------------------------------------------------------
// Canonical Catalog of Deterministically Verified DSA Presets
// -------------------------------------------------------------
const canonicalPresets: Record<string, (q: Question) => ProblemDetail> = {
  'even_or_odd': () => ({
    description: `Given an integer \`n\`, determine whether the number is **Even** or **Odd**. 

A number is even if it is completely divisible by 2 (i.e. \`n % 2 == 0\`). Otherwise, it is an odd number.`,
    examples: [
      { input: 'n = 4', output: '"Even"', explanation: '4 is divisible by 2 with remainder 0.' },
      { input: 'n = 7', output: '"Odd"', explanation: '7 divided by 2 leaves a remainder of 1.' },
      { input: 'n = 0', output: '"Even"', explanation: '0 % 2 == 0, so 0 is categorized as even.' },
    ],
    constraints: [
      '-10^9 <= n <= 10^9',
      'Time Complexity: O(1)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> str:
    # Check parity using bitwise AND or modulo
    return "Even" if n % 2 == 0 else "Odd"

# Local test:
print("Test parity for 4:", solve(4))
`,
    starterCodeJava: `import java.util.*;\n\npublic class Solution {\n    public static String solve(int n) {\n        return (n % 2 == 0) ? "Even" : "Odd";\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            System.out.println(solve(n));\n        }\n    }\n}\n`,
    starterCodeCpp: `#include <iostream>\n#include <string>\n\nusing namespace std;\n\nstring solve(int n) {\n    return (n % 2 == 0) ? "Even" : "Odd";\n}\n\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << solve(n) << endl;\n    }\n    return 0;\n}\n`,
    testCases: [
      { input: '(4)', expected: '"Even"', explanation: '4 is even' },
      { input: '(7)', expected: '"Odd"', explanation: '7 is odd' },
      { input: '(0)', expected: '"Even"', explanation: '0 is even' },
    ],
    editorial: {
      approach: 'Use the modulo operator `n % 2 == 0` or bitwise parity check `(n & 1) == 0`.',
      complexity: 'Time: O(1) | Space: O(1)',
    },
    referenceImplementation: (n: number) => (n % 2 === 0 ? 'Even' : 'Odd'),
    sourceAttribution: 'GeeksforGeeks Parity Problem Reference',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/odd-or-even3618/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'last_digit': () => ({
    description: `Given an integer \`n\`, extract and return its **last digit** (the units place digit).

For example, if the input is \`9874\`, the units place digit is \`4\`. For single digit inputs such as \`5\`, the last digit is \`5\`. The output should always be a non-negative integer between \`0\` and \`9\`.`,
    examples: [
      { input: 'n = 9874', output: '4', explanation: 'The units place digit in 9874 is 4.' },
      { input: 'n = 5', output: '5', explanation: 'Single digit integer 5 has last digit 5.' },
      { input: 'n = 120', output: '0', explanation: 'The units place digit in 120 is 0.' },
    ],
    constraints: [
      '0 <= n <= 10^18',
      'Returned value is an integer in range [0, 9]',
      'Time Complexity: O(1)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> int:
    # Return the unit place digit
    return abs(n) % 10

# Local test:
print("Last digit of 9874:", solve(9874))
`,
    starterCodeJava: `import java.util.*;\n\npublic class Solution {\n    public static int solve(long n) {\n        return (int)(Math.abs(n) % 10);\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            long n = sc.nextLong();\n            System.out.println(solve(n));\n        }\n    }\n}\n`,
    starterCodeCpp: `#include <iostream>\n#include <cmath>\n\nusing namespace std;\n\nint solve(long long n) {\n    return abs(n) % 10;\n}\n\nint main() {\n    long long n;\n    if (cin >> n) {\n        cout << solve(n) << endl;\n    }\n    return 0;\n}\n`,
    testCases: [
      { input: '(9874)', expected: '4', explanation: '9874 % 10 = 4' },
      { input: '(5)', expected: '5', explanation: '5 % 10 = 5' },
      { input: '(120)', expected: '0', explanation: '120 % 10 = 0' },
    ],
    editorial: {
      approach: 'Compute `abs(n) % 10` to directly extract the rightmost decimal digit in constant time.',
      complexity: 'Time: O(1) | Space: O(1)',
    },
    referenceImplementation: (n: number) => Math.abs(n) % 10,
    sourceAttribution: 'GeeksforGeeks Math Foundations',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/last-digit-of-a-number/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'count_digits': () => ({
    description: `Given a positive integer \`n\`, calculate and return the total count of decimal digits present in \`n\`.

If \`n = 156\`, it contains the digits \`1\`, \`5\`, and \`6\`, so the count is \`3\`.`,
    examples: [
      { input: 'n = 156', output: '3', explanation: 'The number 156 consists of 3 decimal digits.' },
      { input: 'n = 7', output: '1', explanation: 'Single digit integer 7 has a digit count of 1.' },
      { input: 'n = 99999', output: '5', explanation: '99999 consists of five digits.' },
    ],
    constraints: [
      '1 <= n <= 10^18',
      'Time Complexity: O(log10(N)) or O(1) via string conversion',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> int:
    # Count digits by length or continuous division
    return len(str(abs(n)))

# Local test:
print("Digit count for 156:", solve(156))
`,
    starterCodeJava: `import java.util.*;\n\npublic class Solution {\n    public static int solve(long n) {\n        return String.valueOf(Math.abs(n)).length();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            long n = sc.nextLong();\n            System.out.println(solve(n));\n        }\n    }\n}\n`,
    starterCodeCpp: `#include <iostream>\n#include <string>\n\nusing namespace std;\n\nint solve(long long n) {\n    return to_string(abs(n)).length();\n}\n\nint main() {\n    long long n;\n    if (cin >> n) {\n        cout << solve(n) << endl;\n    }\n    return 0;\n}\n`,
    testCases: [
      { input: '(156)', expected: '3', explanation: '156 has 3 digits' },
      { input: '(7)', expected: '1', explanation: '7 has 1 digit' },
      { input: '(99999)', expected: '5', explanation: '99999 has 5 digits' },
    ],
    editorial: {
      approach: 'Repeatedly divide the number by 10 until it reaches 0, or calculate `math.floor(math.log10(n)) + 1`.',
      complexity: 'Time: O(log10 N) | Space: O(1)',
    },
    referenceImplementation: (n: number) => Math.abs(n).toString().length,
    sourceAttribution: 'GeeksforGeeks Math Foundations',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/count-digits5716/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'reverse_number': () => ({
    description: `Given a signed 32-bit integer \`n\`, return \`n\` with its digits reversed.

If reversing \`n\` causes the value to overflow outside the signed 32-bit integer range \`[-2^31, 2^31 - 1]\`, then return \`0\`.`,
    examples: [
      { input: 'n = 123', output: '321', explanation: 'Reversing the digits of 123 gives 321.' },
      { input: 'n = -123', output: '-321', explanation: 'The negative sign remains while digits are inverted.' },
      { input: 'n = 120', output: '21', explanation: 'Leading zeros in reversed numbers are dropped.' },
    ],
    constraints: [
      '-2^31 <= n <= 2^31 - 1',
      'Overflow returns 0',
      'Time Complexity: O(log10(N))',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> int:
    sign = -1 if n < 0 else 1
    rev = int(str(abs(n))[::-1])
    res = sign * rev
    return res if -2**31 <= res <= 2**31 - 1 else 0

# Local test:
print("Reversed 123:", solve(123))
`,
    starterCodeJava: `import java.util.*;\n\npublic class Solution {\n    public static int solve(int n) {\n        int rev = 0;\n        while (n != 0) {\n            int pop = n % 10;\n            n /= 10;\n            if (rev > Integer.MAX_VALUE / 10 || (rev == Integer.MAX_VALUE / 10 && pop > 7)) return 0;\n            if (rev < Integer.MIN_VALUE / 10 || (rev == Integer.MIN_VALUE / 10 && pop < -8)) return 0;\n            rev = rev * 10 + pop;\n        }\n        return rev;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            System.out.println(solve(n));\n        }\n    }\n}\n`,
    starterCodeCpp: `#include <iostream>\n#include <climits>\n\nusing namespace std;\n\nint solve(int n) {\n    int rev = 0;\n    while (n != 0) {\n        int pop = n % 10;\n        n /= 10;\n        if (rev > INT_MAX / 10 || (rev == INT_MAX / 10 && pop > 7)) return 0;\n        if (rev < INT_MIN / 10 || (rev == INT_MIN / 10 && pop < -8)) return 0;\n        rev = rev * 10 + pop;\n    }\n    return rev;\n}\n\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << solve(n) << endl;\n    }\n    return 0;\n}\n`,
    testCases: [
      { input: '(123)', expected: '321', explanation: '123 -> 321' },
      { input: '(-123)', expected: '-321', explanation: '-123 -> -321' },
      { input: '(120)', expected: '21', explanation: '120 -> 21' },
    ],
    editorial: {
      approach: 'Extract digits using `% 10` and accumulate into `rev = rev * 10 + digit`, checking for 32-bit integer boundary overflow.',
      complexity: 'Time: O(log10 N) | Space: O(1)',
    },
    referenceImplementation: (n: number) => {
      const sign = n < 0 ? -1 : 1;
      const rev = parseInt(Math.abs(n).toString().split('').reverse().join(''), 10);
      const res = sign * rev;
      return (res >= -2147483648 && res <= 2147483647) ? res : 0;
    },
    sourceAttribution: 'LeetCode #7 (Reverse Integer)',
    sourceUrl: 'https://leetcode.com/problems/reverse-integer/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'power_number': () => ({
    description: `Calculate the value of \`n\` raised to the power \`r\` (\`n^r\`). 

For large numbers, return the result modulo \`10^9 + 7\`.`,
    examples: [
      { input: 'n = 2, r = 10', output: '1024', explanation: '2^10 = 1024.' },
      { input: 'n = 3, r = 4', output: '81', explanation: '3^4 = 81.' },
      { input: 'n = 5, r = 0', output: '1', explanation: 'Any base raised to power 0 equals 1.' },
    ],
    constraints: [
      '1 <= n <= 10^5',
      '0 <= r <= 10^5',
      'Modulo 1,000,000,007',
    ],
    starterCode: `def solve(n: int, r: int) -> int:
    MOD = 10**9 + 7
    return pow(n, r, MOD)

# Local test:
print("2^10:", solve(2, 10))
`,
    starterCodeJava: `import java.util.*;\n\npublic class Solution {\n    public static long solve(long n, long r) {\n        long MOD = 1000000007L;\n        long res = 1;\n        n = n % MOD;\n        while (r > 0) {\n            if ((r & 1) == 1) res = (res * n) % MOD;\n            r = r >> 1;\n            n = (n * n) % MOD;\n        }\n        return res;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            long n = sc.nextLong();\n            long r = sc.hasNextLong() ? sc.nextLong() : 0;\n            System.out.println(solve(n, r));\n        }\n    }\n}\n`,
    starterCodeCpp: `#include <iostream>\n\nusing namespace std;\n\nlong long solve(long long n, long long r) {\n    long long MOD = 1000000007LL;\n    long long res = 1;\n    n = n % MOD;\n    while (r > 0) {\n        if (r & 1) res = (res * n) % MOD;\n        r >>= 1;\n        n = (n * n) % MOD;\n    }\n    return res;\n}\n\nint main() {\n    long long n, r;\n    if (cin >> n >> r) {\n        cout << solve(n, r) << endl;\n    }\n    return 0;\n}\n`,
    testCases: [
      { input: '(2, 10)', expected: '1024', explanation: '2^10 = 1024' },
      { input: '(3, 4)', expected: '81', explanation: '3^4 = 81' },
      { input: '(5, 0)', expected: '1', explanation: '5^0 = 1' },
    ],
    editorial: {
      approach: 'Binary exponentiation achieves O(log R) time complexity by halving the exponent at each step.',
      complexity: 'Time: O(log R) | Space: O(1)',
    },
    referenceImplementation: (n: number, r: number) => {
      let res = 1n;
      let base = BigInt(n);
      let exp = BigInt(r);
      const mod = 1000000007n;
      while (exp > 0n) {
        if (exp % 2n === 1n) res = (res * base) % mod;
        base = (base * base) % mod;
        exp /= 2n;
      }
      return Number(res);
    },
    sourceAttribution: 'GeeksforGeeks Power of Numbers',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/power-of-numbers-1587115620/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'gcd': () => ({
    description: `Given two positive integers \`a\` and \`b\`, find and return their **Greatest Common Divisor (GCD)**, also termed the Highest Common Factor (HCF).

The greatest common divisor of two integers is the largest positive integer that divides both numbers without a remainder.`,
    examples: [
      { input: 'a = 12, b = 18', output: '6', explanation: 'Common divisors of 12 and 18 are 1, 2, 3, 6. The largest is 6.' },
      { input: 'a = 20, b = 28', output: '4', explanation: 'GCD of 20 and 28 is 4.' },
      { input: 'a = 7, b = 13', output: '1', explanation: '7 and 13 are coprime.' },
    ],
    constraints: [
      '1 <= a, b <= 10^9',
      'Time Complexity: O(log(min(A, B)))',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(a: int, b: int) -> int:
    # Euclidean Algorithm
    while b:
        a, b = b, a % b
    return a

# Local test:
print("GCD(12, 18):", solve(12, 18))
`,
    testCases: [
      { input: '(12, 18)', expected: '6', explanation: 'GCD(12, 18) = 6' },
      { input: '(20, 28)', expected: '4', explanation: 'GCD(20, 28) = 4' },
      { input: '(7, 13)', expected: '1', explanation: 'GCD(7, 13) = 1' },
    ],
    editorial: {
      approach: 'Apply Euclidean Algorithm: `gcd(a, b) = gcd(b, a % b)` until `b == 0`.',
      complexity: 'Time: O(log(min(A, B))) | Space: O(1)',
    },
    referenceImplementation: (a: number, b: number) => {
      while (b) {
        const t = b;
        b = a % b;
        a = t;
      }
      return a;
    },
    sourceAttribution: 'GeeksforGeeks GCD Reference',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/gcd-of-two-numbers3459/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'divisors': () => ({
    description: `Given a positive integer \`n\`, find and return all positive divisors of \`n\` in sorted ascending order.`,
    examples: [
      { input: 'n = 12', output: '[1, 2, 3, 4, 6, 12]', explanation: '12 is evenly divided by 1, 2, 3, 4, 6, and 12.' },
      { input: 'n = 7', output: '[1, 7]', explanation: '7 is prime, so its only divisors are 1 and 7.' },
      { input: 'n = 1', output: '[1]', explanation: '1 has only 1 divisor.' },
    ],
    constraints: [
      '1 <= n <= 10^6',
      'Time Complexity: O(sqrt(N))',
      'Auxiliary Space: O(number of divisors)',
    ],
    starterCode: `def solve(n: int) -> list:
    divs = set()
    for i in range(1, int(n**0.5) + 1):
        if n % i == 0:
            divs.add(i)
            divs.add(n // i)
    return sorted(list(divs))

# Local test:
print("Divisors of 12:", solve(12))
`,
    testCases: [
      { input: '(12)', expected: '[1, 2, 3, 4, 6, 12]', explanation: 'Divisors of 12' },
      { input: '(7)', expected: '[1, 7]', explanation: 'Divisors of 7' },
      { input: '(1)', expected: '[1]', explanation: 'Divisors of 1' },
    ],
    editorial: {
      approach: 'Iterate up to `sqrt(N)`. For every factor `i`, both `i` and `n // i` are divisors.',
      complexity: 'Time: O(sqrt(N)) | Space: O(D)',
    },
    referenceImplementation: (n: number) => {
      const divs = new Set<number>();
      for (let i = 1; i * i <= n; i++) {
        if (n % i === 0) {
          divs.add(i);
          divs.add(n / i);
        }
      }
      return Array.from(divs).sort((a, b) => a - b);
    },
    sourceAttribution: 'GeeksforGeeks All Divisors of a Number',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/all-divisors-of-a-number/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'prime': () => ({
    description: `Given a natural number \`n\`, determine whether \`n\` is a **Prime Number**.

A prime number is a natural number strictly greater than 1 that has no positive divisors other than 1 and itself. Return \`True\` if prime, else \`False\`.`,
    examples: [
      { input: 'n = 11', output: 'True', explanation: '11 has no divisors other than 1 and 11.' },
      { input: 'n = 15', output: 'False', explanation: '15 is divisible by 3 and 5.' },
      { input: 'n = 1', output: 'False', explanation: '1 is not prime by definition.' },
    ],
    constraints: [
      '1 <= n <= 10^9',
      'Time Complexity: O(sqrt(N))',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> bool:
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

# Local test:
print("Is 11 prime?:", solve(11))
`,
    testCases: [
      { input: '(11)', expected: 'True', explanation: '11 is prime' },
      { input: '(15)', expected: 'False', explanation: '15 is composite' },
      { input: '(2)', expected: 'True', explanation: '2 is the only even prime' },
    ],
    editorial: {
      approach: 'Check divisibility from 2 up to `floor(sqrt(n))`. If no factor divides evenly, `n` is prime.',
      complexity: 'Time: O(sqrt(N)) | Space: O(1)',
    },
    referenceImplementation: (n: number) => {
      if (n <= 1) return false;
      for (let i = 2; i * i <= n; i++) {
        if (n % i === 0) return false;
      }
      return true;
    },
    sourceAttribution: 'GeeksforGeeks Prime Number Verification',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/prime-number2314/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'armstrong': () => ({
    description: `An **Armstrong number** (or narcissistic number) for a 3-digit number is an integer such that the sum of the cubes of its digits equals the number itself.

Given a number \`n\`, return \`True\` if it is an Armstrong number, otherwise return \`False\`.`,
    examples: [
      { input: 'n = 153', output: 'True', explanation: '1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153.' },
      { input: 'n = 370', output: 'True', explanation: '3^3 + 7^3 + 0^3 = 27 + 343 + 0 = 370.' },
      { input: 'n = 120', output: 'False', explanation: '1^3 + 2^3 + 0^3 = 1 + 8 + 0 = 9 != 120.' },
    ],
    constraints: [
      '100 <= n <= 999',
      'Time Complexity: O(1)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> bool:
    digits = [int(d) for d in str(n)]
    return sum(d**3 for d in digits) == n

# Local test:
print("Is 153 Armstrong?:", solve(153))
`,
    testCases: [
      { input: '(153)', expected: 'True', explanation: '153 is an Armstrong number' },
      { input: '(370)', expected: 'True', explanation: '370 is an Armstrong number' },
      { input: '(120)', expected: 'False', explanation: '120 is not Armstrong' },
    ],
    editorial: {
      approach: 'Extract the individual digits, compute their cubes, and verify equality with the original integer.',
      complexity: 'Time: O(1) | Space: O(1)',
    },
    referenceImplementation: (n: number) => {
      const digits = n.toString().split('').map(Number);
      return digits.reduce((sum, d) => sum + d ** 3, 0) === n;
    },
    sourceAttribution: 'GeeksforGeeks Armstrong Numbers',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/armstrong-numbers2727/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'palindrome_number': () => ({
    description: `Given an integer \`n\`, return \`True\` if \`n\` is a **palindrome**, and \`False\` otherwise.

An integer is a palindrome when it reads the same backward as forward. Negative numbers are not palindromes because the negative sign is placed at the front.`,
    examples: [
      { input: 'n = 121', output: 'True', explanation: '121 reads 121 from left to right and right to left.' },
      { input: 'n = -121', output: 'False', explanation: 'Left to right is -121; right to left is 121-.' },
      { input: 'n = 10', output: 'False', explanation: 'Reads 01 from right to left.' },
    ],
    constraints: [
      '-2^31 <= n <= 2^31 - 1',
      'Time Complexity: O(log10(N))',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> bool:
    if n < 0:
        return False
    s = str(n)
    return s == s[::-1]

# Local test:
print("Is 121 palindrome?:", solve(121))
`,
    testCases: [
      { input: '(121)', expected: 'True', explanation: '121 is palindrome' },
      { input: '(-121)', expected: 'False', explanation: 'Negative numbers are not palindromes' },
      { input: '(10)', expected: 'False', explanation: '10 is not palindrome' },
    ],
    editorial: {
      approach: 'Negative numbers are immediately false. For non-negative integers, reverse the digits or compare string representations.',
      complexity: 'Time: O(log10 N) | Space: O(1)',
    },
    referenceImplementation: (n: number) => {
      if (n < 0) return false;
      const s = n.toString();
      return s === s.split('').reverse().join('');
    },
    sourceAttribution: 'LeetCode #9 (Palindrome Number)',
    sourceUrl: 'https://leetcode.com/problems/palindrome-number/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'square_root': () => ({
    description: `Given a non-negative integer \`n\`, compute and return the **integer square root** of \`n\` (\`floor(sqrt(n))\`).

Do not use built-in fractional power functions. Solve using Binary Search.`,
    examples: [
      { input: 'n = 4', output: '2', explanation: 'The square root of 4 is 2.' },
      { input: 'n = 8', output: '2', explanation: 'sqrt(8) = 2.8284..., returning floor gives 2.' },
      { input: 'n = 0', output: '0', explanation: 'The square root of 0 is 0.' },
    ],
    constraints: [
      '0 <= n <= 2^31 - 1',
      'Time Complexity: O(log N)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> int:
    if n < 2:
        return n
    left, right = 1, n // 2
    ans = 1
    while left <= right:
        mid = (left + right) // 2
        if mid * mid <= n:
            ans = mid
            left = mid + 1
        else:
            right = mid - 1
    return ans

# Local test:
print("Square root of 8:", solve(8))
`,
    testCases: [
      { input: '(4)', expected: '2', explanation: 'sqrt(4) = 2' },
      { input: '(8)', expected: '2', explanation: 'floor(sqrt(8)) = 2' },
      { input: '(0)', expected: '0', explanation: 'sqrt(0) = 0' },
    ],
    editorial: {
      approach: 'Binary search over the range [1, n // 2] finding the largest integer whose square <= n.',
      complexity: 'Time: O(log N) | Space: O(1)',
    },
    referenceImplementation: (n: number) => Math.floor(Math.sqrt(n)),
    sourceAttribution: 'LeetCode #69 (Sqrt(x))',
    sourceUrl: 'https://leetcode.com/problems/sqrtx/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'perfect_number': () => ({
    description: `A **perfect number** is a positive integer that is equal to the sum of its positive proper divisors, excluding the number itself.

Given an integer \`n\`, return \`True\` if \`n\` is a perfect number, otherwise return \`False\`.`,
    examples: [
      { input: 'n = 28', output: 'True', explanation: '28 = 1 + 2 + 4 + 7 + 14. All are positive proper divisors of 28.' },
      { input: 'n = 7', output: 'False', explanation: 'The only proper divisor of 7 is 1, and 1 != 7.' },
      { input: 'n = 6', output: 'True', explanation: '6 = 1 + 2 + 3.' },
    ],
    constraints: [
      '1 <= n <= 10^8',
      'Time Complexity: O(sqrt(N))',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(n: int) -> bool:
    if n <= 1:
        return False
    total = 1
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            total += i
            if i != n // i:
                total += n // i
    return total == n

# Local test:
print("Is 28 perfect?:", solve(28))
`,
    testCases: [
      { input: '(28)', expected: 'True', explanation: '28 is perfect' },
      { input: '(7)', expected: 'False', explanation: '7 is not perfect' },
      { input: '(6)', expected: 'True', explanation: '6 is perfect' },
    ],
    editorial: {
      approach: 'Iterate from 2 up to sqrt(N) to sum paired divisors, comparing the total with N.',
      complexity: 'Time: O(sqrt(N)) | Space: O(1)',
    },
    referenceImplementation: (n: number) => {
      if (n <= 1) return false;
      let sum = 1;
      for (let i = 2; i * i <= n; i++) {
        if (n % i === 0) {
          sum += i;
          if (i !== n / i) sum += n / i;
        }
      }
      return sum === n;
    },
    sourceAttribution: 'LeetCode #507 (Perfect Number)',
    sourceUrl: 'https://leetcode.com/problems/perfect-number/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'min_max_array': () => ({
    description: `Given an array of integers \`nums\` of size \`N\`, find and return the minimum and maximum elements in the array in the format \`[min_val, max_val]\`.`,
    examples: [
      { input: 'nums = [3, 2, 1, 56, 1000, 167]', output: '[1, 1000]', explanation: 'Minimum is 1 and maximum is 1000.' },
      { input: 'nums = [1, 345, 234, 21, 56789]', output: '[1, 56789]', explanation: 'Minimum is 1 and maximum is 56789.' },
      { input: 'nums = [5]', output: '[5, 5]', explanation: 'Single element is both min and max.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
      'Time Complexity: O(N)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(nums: list) -> list:
    # Single pass min/max extraction
    return [min(nums), max(nums)]

# Local test:
print("Min and Max:", solve([3, 2, 1, 56, 1000, 167]))
`,
    testCases: [
      { input: '([3, 2, 1, 56, 1000, 167])', expected: '[1, 1000]', explanation: 'Min: 1, Max: 1000' },
      { input: '([5])', expected: '[5, 5]', explanation: 'Single element' },
      { input: '([-10, 0, 50])', expected: '[-10, 50]', explanation: 'Negative numbers' },
    ],
    editorial: {
      approach: 'Linear scan tracking current minimum and maximum values with 2*(N-1) comparisons.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[]) => [Math.min(...nums), Math.max(...nums)],
    sourceAttribution: 'GeeksforGeeks Min and Max in Array',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/find-minimum-and-maximum-element-in-an-array4428/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'third_largest': () => ({
    description: `Given an array of distinct integers \`nums\`, find and return the **third largest** distinct element. If fewer than three distinct elements exist, return the maximum element.`,
    examples: [
      { input: 'nums = [2, 4, 1, 3, 5]', output: '3', explanation: 'Sorted descending: [5, 4, 3, 2, 1]. Third largest is 3.' },
      { input: 'nums = [1, 2]', output: '2', explanation: 'Fewer than 3 distinct elements, so return max: 2.' },
      { input: 'nums = [10, 20, 30, 40]', output: '20', explanation: 'Sorted descending: [40, 30, 20, 10]. Third largest is 20.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
      'Time Complexity: O(N)',
    ],
    starterCode: `def solve(nums: list) -> int:
    unique = sorted(list(set(nums)), reverse=True)
    return unique[2] if len(unique) >= 3 else unique[0]

# Local test:
print("Third largest:", solve([2, 4, 1, 3, 5]))
`,
    testCases: [
      { input: '([2, 4, 1, 3, 5])', expected: '3', explanation: 'Third largest is 3' },
      { input: '([1, 2])', expected: '2', explanation: 'Returns max when < 3 unique' },
      { input: '([10, 20, 30, 40])', expected: '20', explanation: 'Third largest is 20' },
    ],
    editorial: {
      approach: 'Track three variables (first, second, third) in a single linear pass or use min-heap.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[]) => {
      const u = Array.from(new Set(nums)).sort((a, b) => b - a);
      return u.length >= 3 ? u[2] : u[0];
    },
    sourceAttribution: 'GeeksforGeeks Third Largest Element',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/third-largest-element/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'search_element': () => ({
    description: `Given an array \`nums\` and an integer \`k\`, return the index of the first occurrence of \`k\` in the array. If \`k\` is not found, return \`-1\`.`,
    examples: [
      { input: 'nums = [1, 2, 3, 4], k = 3', output: '2', explanation: '3 is present at index 2.' },
      { input: 'nums = [5, 4, 3, 2, 1], k = 10', output: '-1', explanation: '10 is not in the array.' },
      { input: 'nums = [42], k = 42', output: '0', explanation: '42 is found at index 0.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^9 <= nums[i], k <= 10^9',
      'Time Complexity: O(N)',
    ],
    starterCode: `def solve(nums: list, k: int) -> int:
    return nums.index(k) if k in nums else -1

# Local test:
print("Search index:", solve([1, 2, 3, 4], 3))
`,
    testCases: [
      { input: '([1, 2, 3, 4], 3)', expected: '2', explanation: 'Found at index 2' },
      { input: '([5, 4, 3, 2, 1], 10)', expected: '-1', explanation: 'Element absent' },
      { input: '([42], 42)', expected: '0', explanation: 'Index 0' },
    ],
    editorial: {
      approach: 'Linear search scanning elements sequentially from index 0 to N-1.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[], k: number) => nums.indexOf(k),
    sourceAttribution: 'GeeksforGeeks Linear Search in Array',
    sourceUrl: 'https://www.geeksforgeeks.org/problems/search-an-element-in-an-array-1587115621/1',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'missing_number': () => ({
    description: `Given an array \`nums\` containing \`n\` distinct numbers in the range \`[0, n]\`, return the only number in the range that is missing from the array.`,
    examples: [
      { input: 'nums = [3, 0, 1]', output: '2', explanation: 'n = 3 since there are 3 numbers. All numbers in [0, 3] are present except 2.' },
      { input: 'nums = [0, 1]', output: '2', explanation: 'n = 2. Range is [0, 2]. 2 is missing.' },
      { input: 'nums = [9, 6, 4, 2, 3, 5, 7, 0, 1]', output: '8', explanation: 'n = 9. 8 is missing from [0, 9].' },
    ],
    constraints: [
      'n == nums.length',
      '1 <= n <= 10^4',
      '0 <= nums[i] <= n',
      'All elements are unique',
    ],
    starterCode: `def solve(nums: list) -> int:
    n = len(nums)
    expected_sum = (n * (n + 1)) // 2
    return expected_sum - sum(nums)

# Local test:
print("Missing number:", solve([3, 0, 1]))
`,
    testCases: [
      { input: '([3, 0, 1])', expected: '2', explanation: '2 is missing' },
      { input: '([0, 1])', expected: '2', explanation: '2 is missing' },
      { input: '([9, 6, 4, 2, 3, 5, 7, 0, 1])', expected: '8', explanation: '8 is missing' },
    ],
    editorial: {
      approach: 'Gaussian summation `n*(n+1)//2` minus `sum(nums)` gives the missing value in O(N) time and O(1) space.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[]) => {
      const n = nums.length;
      const expected = (n * (n + 1)) / 2;
      return expected - nums.reduce((a, b) => a + b, 0);
    },
    sourceAttribution: 'LeetCode #268 (Missing Number)',
    sourceUrl: 'https://leetcode.com/problems/missing-number/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'sort_012': () => ({
    description: `Given an array \`nums\` with \`n\` objects colored red, white, or blue, sort them **in-place** so that objects of the same color are adjacent, with the colors in the order \`0\` (red), \`1\` (white), and \`2\` (blue).

Solve this in a single pass using the **Dutch National Flag algorithm** without using the library sort function.`,
    examples: [
      { input: 'nums = [2, 0, 2, 1, 1, 0]', output: '[0, 0, 1, 1, 2, 2]', explanation: '0s grouped first, followed by 1s and 2s.' },
      { input: 'nums = [2, 0, 1]', output: '[0, 1, 2]', explanation: 'Sorted order.' },
      { input: 'nums = [0]', output: '[0]', explanation: 'Single element array.' },
    ],
    constraints: [
      'n == nums.length',
      '1 <= n <= 300',
      'nums[i] is either 0, 1, or 2',
      'Time Complexity: O(N)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(nums: list) -> list:
    # Dutch National Flag 3-pointer partition
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
    return nums

# Local test:
print("Sorted 0, 1, 2:", solve([2, 0, 2, 1, 1, 0]))
`,
    testCases: [
      { input: '([2, 0, 2, 1, 1, 0])', expected: '[0, 0, 1, 1, 2, 2]', explanation: 'Dutch flag sort' },
      { input: '([2, 0, 1])', expected: '[0, 1, 2]', explanation: 'Sorted' },
      { input: '([0])', expected: '[0]', explanation: 'Single element' },
    ],
    editorial: {
      approach: 'Three pointers: `low` bounds the 0s, `high` bounds the 2s, and `mid` iterates and swaps into place in O(N) single pass.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[]) => [...nums].sort((a, b) => a - b),
    sourceAttribution: 'LeetCode #75 (Sort Colors)',
    sourceUrl: 'https://leetcode.com/problems/sort-colors/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'parentheses_min_add': () => ({
    description: `A parentheses string is valid if and only if:
- It is the empty string,
- It can be written as **AB** (A concatenated with B), where A and B are valid strings, or
- It can be written as **(A)**, where A is a valid string.

You are given a parentheses string \`s\`. In one move, you can insert a parenthesis at any position of the string.

Return the minimum number of moves required to make \`s\` valid.`,
    examples: [
      { input: 's = "())"', output: '1', explanation: 'We can add \'(\' to the front to form "()()".' },
      { input: 's = "((("', output: '3', explanation: 'We can add \')))\' to the end to form "((()))".' },
      { input: 's = "()"', output: '0', explanation: 'The string is already balanced.' },
    ],
    constraints: [
      '1 <= s.length <= 1000',
      's[i] is either \'(\' or \')\'',
      'Time Complexity: O(N)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(s: str) -> int:
    open_needed = 0
    close_needed = 0
    for char in s:
        if char == '(':
            close_needed += 1
        elif close_needed > 0:
            close_needed -= 1
        else:
            open_needed += 1
    return open_needed + close_needed

# Local test:
print("Min add for '())':", solve("())"))
`,
    testCases: [
      { input: '("())")', expected: '1', explanation: 'Needs 1 opening parenthesis' },
      { input: '("(((")', expected: '3', explanation: 'Needs 3 closing parentheses' },
      { input: '("()")', expected: '0', explanation: 'Already balanced' },
    ],
    editorial: {
      approach: 'Maintain a balance counter of open parentheses. Increment when finding `(`, decrement when matching `)`. Unmatched `)` increment required additions.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (s: string) => {
      let open = 0;
      let close = 0;
      for (const char of s) {
        if (char === '(') close++;
        else if (close > 0) close--;
        else open++;
      }
      return open + close;
    },
    sourceAttribution: 'LeetCode #921 (Minimum Add to Make Parentheses Valid)',
    sourceUrl: 'https://leetcode.com/problems/minimum-add-to-make-parentheses-valid/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'two_sum': () => ({
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.`,
    examples: [
      { input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]', explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].' },
      { input: 'nums = [3, 3], target = 6', output: '[0, 1]', explanation: 'Because nums[0] + nums[1] == 6, we return [0, 1].' },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists',
    ],
    starterCode: `def solve(nums: list, target: int) -> list:
    # Single-pass Hash Map
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Local test:
print("Two Sum Result:", solve([2, 7, 11, 15], 9))
`,
    testCases: [
      { input: '([2, 7, 11, 15], 9)', expected: '[0, 1]', explanation: 'nums[0] + nums[1] = 9' },
      { input: '([3, 2, 4], 6)', expected: '[1, 2]', explanation: 'nums[1] + nums[2] = 6' },
      { input: '([3, 3], 6)', expected: '[0, 1]', explanation: 'nums[0] + nums[1] = 6' },
    ],
    editorial: {
      approach: 'Hash map stores elements and indices in a single pass. Complement check runs in O(1) amortized time.',
      complexity: 'Time: O(N) | Space: O(N)',
    },
    referenceImplementation: (nums: number[], target: number) => {
      const map = new Map<number, number>();
      for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) return [map.get(diff)!, i];
        map.set(nums[i], i);
      }
      return [];
    },
    sourceAttribution: 'LeetCode #1 (Two Sum)',
    sourceUrl: 'https://leetcode.com/problems/two-sum/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'three_sum': () => ({
    description: `Given an integer array \`nums\`, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.

Notice that the solution set must not contain duplicate triplets.`,
    examples: [
      { input: 'nums = [-1, 0, 1, 2, -1, -4]', output: '[[-1, -1, 2], [-1, 0, 1]]', explanation: 'nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0. Distinct triplets.' },
      { input: 'nums = [0, 1, 1]', output: '[]', explanation: 'No triplet sums to 0.' },
      { input: 'nums = [0, 0, 0]', output: '[[0, 0, 0]]', explanation: 'Only triplet is [0, 0, 0].' },
    ],
    constraints: [
      '3 <= nums.length <= 3000',
      '-10^5 <= nums[i] <= 10^5',
    ],
    starterCode: `def solve(nums: list) -> list:
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                while l < r and nums[l] == nums[l + 1]:
                    l += 1
                while l < r and nums[r] == nums[r - 1]:
                    r -= 1
                l += 1
                r -= 1
    return res

# Local test:
print("3Sum:", solve([-1, 0, 1, 2, -1, -4]))
`,
    testCases: [
      { input: '([-1, 0, 1, 2, -1, -4])', expected: '[[-1, -1, 2], [-1, 0, 1]]', explanation: 'Triplets sum to 0' },
      { input: '([0, 1, 1])', expected: '[]', explanation: 'No valid triplets' },
      { input: '([0, 0, 0])', expected: '[[0, 0, 0]]', explanation: 'Single zero triplet' },
    ],
    editorial: {
      approach: 'Sort the array first. Fix one element and use a two-pointer scan for the other two, skipping identical elements to prevent duplicates.',
      complexity: 'Time: O(N^2) | Space: O(1) extra',
    },
    referenceImplementation: (nums: number[]) => {
      const sorted = [...nums].sort((a, b) => a - b);
      const res: number[][] = [];
      for (let i = 0; i < sorted.length - 2; i++) {
        if (i > 0 && sorted[i] === sorted[i - 1]) continue;
        let l = i + 1;
        let r = sorted.length - 1;
        while (l < r) {
          const s = sorted[i] + sorted[l] + sorted[r];
          if (s < 0) l++;
          else if (s > 0) r--;
          else {
            res.push([sorted[i], sorted[l], sorted[r]]);
            while (l < r && sorted[l] === sorted[l + 1]) l++;
            while (l < r && sorted[r] === sorted[r - 1]) r--;
            l++;
            r--;
          }
        }
      }
      return res;
    },
    sourceAttribution: 'LeetCode #15 (3Sum)',
    sourceUrl: 'https://leetcode.com/problems/3sum/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  // Problem ID 414: Correct authentic math challenge
  'average_of_divisible_numbers': () => ({
    description: `Given three positive integers \`k\`, \`start\`, and \`end\`, calculate and return the arithmetic average (mean) of all integers in the inclusive range \`[start, end]\` that are divisible by \`k\`.

If no numbers in the range are divisible by \`k\`, return \`0.0\`.`,
    examples: [
      { input: 'k = 6, start = 6, end = 50', output: '27.0', explanation: 'Numbers divisible by 6 between 6 and 50 are: 6, 12, 18, 24, 30, 36, 42, 48. Sum = 216, Count = 8. Average = 216/8 = 27.0.' },
      { input: 'k = 5, start = 10, end = 25', output: '17.5', explanation: 'Numbers are: 10, 15, 20, 25. Sum = 70, Count = 4. Average = 70/4 = 17.5.' },
      { input: 'k = 7, start = 1, end = 6', output: '0.0', explanation: 'No numbers in [1, 6] are divisible by 7.' },
    ],
    constraints: [
      '1 <= k <= 10^5',
      '1 <= start <= end <= 10^6',
      'Result is formatted as floating point arithmetic mean',
      'Time Complexity: O((end - start) / k)',
      'Auxiliary Space: O(1)',
    ],
    starterCode: `def solve(k: int, start: int, end: int) -> float:
    # Find arithmetic average of all multiples of k in [start, end]
    multiples = [x for x in range(start, end + 1) if x % k == 0]
    return float(sum(multiples) / len(multiples)) if multiples else 0.0

# Local test:
print("Average divisible by 6 in [6, 50]:", solve(6, 6, 50))
`,
    testCases: [
      { input: '(6, 6, 50)', expected: '27', explanation: 'Average of multiples of 6 between 6 and 50' },
      { input: '(5, 10, 25)', expected: '17.5', explanation: 'Average of 10, 15, 20, 25' },
      { input: '(7, 1, 6)', expected: '0', explanation: 'No multiples in range' },
      { input: '(4, 4, 4)', expected: '4', explanation: 'Single element range' },
    ],
    editorial: {
      approach: 'Identify all integers x in [start, end] where x % k == 0. Compute the arithmetic mean as sum(multiples) / count(multiples).',
      complexity: 'Time: O((end - start) / k) | Space: O(1)',
    },
    referenceImplementation: (k: number, start: number, end: number) => {
      const multiples: number[] = [];
      for (let x = start; x <= end; x++) {
        if (x % k === 0) multiples.push(x);
      }
      return multiples.length ? multiples.reduce((a, b) => a + b, 0) / multiples.length : 0;
    },
    sourceAttribution: 'Ap Workspace Aptitude Cheatsheet (Authored Math Challenge)',
    sourceUrl: 'https://youtu.be/rhSxQ4ieAYc?si=UTkOg0zYu2ooT5Gx',
    isApAuthored: true,
    isCanonicalVerified: true,
    verificationStatus: 'verified',
  }),

  'valid_parentheses': () => ({
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: 'True', explanation: 'Parentheses match cleanly.' },
      { input: 's = "()[]{}"', output: 'True', explanation: 'All bracket pairs match in valid sequential order.' },
      { input: 's = "(]"', output: 'False', explanation: 'Mismatched closing bracket type.' },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only: ()[]{}',
      'Time Complexity: O(N)',
      'Auxiliary Space: O(N)',
    ],
    starterCode: `def solve(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

# Local test:
print("Is '()[]{}' valid?:", solve("()[]{}"))
`,
    testCases: [
      { input: '("()")', expected: 'True', explanation: 'Single pair' },
      { input: '("()[]{}")', expected: 'True', explanation: 'Multiple pairs' },
      { input: '("(]")', expected: 'False', explanation: 'Mismatched brackets' },
      { input: '("([)]")', expected: 'False', explanation: 'Interleaved invalid nesting' },
    ],
    editorial: {
      approach: 'Use a LIFO stack. Push opening brackets; when encountering a closing bracket, pop and verify type match.',
      complexity: 'Time: O(N) | Space: O(N)',
    },
    referenceImplementation: (s: string) => {
      const stack: string[] = [];
      const map: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
      for (const ch of s) {
        if (ch in map) {
          const top = stack.pop() || '#';
          if (map[ch] !== top) return false;
        } else {
          stack.push(ch);
        }
      }
      return stack.length === 0;
    },
    sourceAttribution: 'LeetCode #20 (Valid Parentheses)',
    sourceUrl: 'https://leetcode.com/problems/valid-parentheses/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'binary_search': () => ({
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', output: '4', explanation: '9 exists in nums and its index is 4.' },
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', output: '-1', explanation: '2 does not exist in nums so return -1.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 < nums[i], target < 10^4',
      'All the integers in nums are unique',
      'nums is sorted in ascending order',
    ],
    starterCode: `def solve(nums: list, target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Local test:
print("Binary search for 9:", solve([-1, 0, 3, 5, 9, 12], 9))
`,
    testCases: [
      { input: '([-1, 0, 3, 5, 9, 12], 9)', expected: '4', explanation: 'Found at index 4' },
      { input: '([-1, 0, 3, 5, 9, 12], 2)', expected: '-1', explanation: 'Not found' },
      { input: '([5], 5)', expected: '0', explanation: 'Single element match' },
    ],
    editorial: {
      approach: 'Classic binary search repeatedly halving search intervals.',
      complexity: 'Time: O(log N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[], target: number) => {
      let l = 0, r = nums.length - 1;
      while (l <= r) {
        const mid = Math.floor((l + r) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) l = mid + 1;
        else r = mid - 1;
      }
      return -1;
    },
    sourceAttribution: 'LeetCode #704 (Binary Search)',
    sourceUrl: 'https://leetcode.com/problems/binary-search/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'maximum_subarray': () => ({
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      { input: 'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]', output: '6', explanation: 'The subarray [4, -1, 2, 1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1', explanation: 'The subarray [1] has the largest sum 1.' },
      { input: 'nums = [5, 4, -1, 7, 8]', output: '23', explanation: 'The subarray [5, 4, -1, 7, 8] has the largest sum 23.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    starterCode: `def solve(nums: list) -> int:
    # Kadane's Algorithm
    max_so_far = nums[0]
    curr_max = nums[0]
    for x in nums[1:]:
        curr_max = max(x, curr_max + x)
        max_so_far = max(max_so_far, curr_max)
    return max_so_far

# Local test:
print("Max Subarray:", solve([-2, 1, -3, 4, -1, 2, 1, -5, 4]))
`,
    testCases: [
      { input: '([-2, 1, -3, 4, -1, 2, 1, -5, 4])', expected: '6', explanation: 'Kadane result is 6' },
      { input: '([1])', expected: '1', explanation: 'Single element' },
      { input: '([5, 4, -1, 7, 8])', expected: '23', explanation: 'All positive elements sum' },
    ],
    editorial: {
      approach: "Kadane's algorithm maintains the maximum subarray sum ending at each position.",
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[]) => {
      let maxSoFar = nums[0];
      let curr = nums[0];
      for (let i = 1; i < nums.length; i++) {
        curr = Math.max(nums[i], curr + nums[i]);
        maxSoFar = Math.max(maxSoFar, curr);
      }
      return maxSoFar;
    },
    sourceAttribution: 'LeetCode #53 (Maximum Subarray)',
    sourceUrl: 'https://leetcode.com/problems/maximum-subarray/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'contains_duplicate': () => ({
    description: `Given an integer array \`nums\`, return \`True\` if any value appears **at least twice** in the array, and return \`False\` if every element is distinct.`,
    examples: [
      { input: 'nums = [1, 2, 3, 1]', output: 'True', explanation: '1 appears at index 0 and 3.' },
      { input: 'nums = [1, 2, 3, 4]', output: 'False', explanation: 'All elements are distinct.' },
      { input: 'nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]', output: 'True', explanation: 'Multiple duplicates exist.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
    ],
    starterCode: `def solve(nums: list) -> bool:
    return len(nums) != len(set(nums))

# Local test:
print("Contains duplicate:", solve([1, 2, 3, 1]))
`,
    testCases: [
      { input: '([1, 2, 3, 1])', expected: 'True', explanation: 'Duplicate 1' },
      { input: '([1, 2, 3, 4])', expected: 'False', explanation: 'All distinct' },
      { input: '([1, 1, 1])', expected: 'True', explanation: 'Identical elements' },
    ],
    editorial: {
      approach: 'Hash set tracking or comparing `len(nums) != len(set(nums))`.',
      complexity: 'Time: O(N) | Space: O(N)',
    },
    referenceImplementation: (nums: number[]) => new Set(nums).size !== nums.length,
    sourceAttribution: 'LeetCode #217 (Contains Duplicate)',
    sourceUrl: 'https://leetcode.com/problems/contains-duplicate/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'best_time_to_buy_and_sell_stock': () => ({
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      { input: 'prices = [7, 1, 5, 3, 6, 4]', output: '5', explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.' },
      { input: 'prices = [7, 6, 4, 3, 1]', output: '0', explanation: 'In this case, no transactions are done and max profit = 0.' },
    ],
    constraints: [
      '1 <= prices.length <= 10^5',
      '0 <= prices[i] <= 10^4',
    ],
    starterCode: `def solve(prices: list) -> int:
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        if price < min_price:
            min_price = price
        elif price - min_price > max_profit:
            max_profit = price - min_price
    return max_profit

# Local test:
print("Max Stock Profit:", solve([7, 1, 5, 3, 6, 4]))
`,
    testCases: [
      { input: '([7, 1, 5, 3, 6, 4])', expected: '5', explanation: 'Buy at 1, sell at 6' },
      { input: '([7, 6, 4, 3, 1])', expected: '0', explanation: 'Monotonically decreasing' },
      { input: '([2, 4, 1])', expected: '2', explanation: 'Buy at 2, sell at 4' },
    ],
    editorial: {
      approach: 'Single pass tracking minimum buying price seen so far and maximum prospective difference.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (prices: number[]) => {
      let minP = Infinity;
      let maxP = 0;
      for (const p of prices) {
        if (p < minP) minP = p;
        else if (p - minP > maxP) maxP = p - minP;
      }
      return maxP;
    },
    sourceAttribution: 'LeetCode #121 (Best Time to Buy and Sell Stock)',
    sourceUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'climbing_stairs': () => ({
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    examples: [
      { input: 'n = 2', output: '2', explanation: 'There are two ways: (1+1) and (2).' },
      { input: 'n = 3', output: '3', explanation: 'There are three ways: (1+1+1), (1+2), and (2+1).' },
    ],
    constraints: [
      '1 <= n <= 45',
    ],
    starterCode: `def solve(n: int) -> int:
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

# Local test:
print("Climbing stairs for n=3:", solve(3))
`,
    testCases: [
      { input: '(2)', expected: '2', explanation: '2 steps' },
      { input: '(3)', expected: '3', explanation: '3 steps' },
      { input: '(5)', expected: '8', explanation: '5 steps' },
    ],
    editorial: {
      approach: 'Fibonacci recurrence: `ways(n) = ways(n-1) + ways(n-2)`.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (n: number) => {
      if (n <= 2) return n;
      let a = 1, b = 2;
      for (let i = 3; i <= n; i++) {
        const next = a + b;
        a = b;
        b = next;
      }
      return b;
    },
    sourceAttribution: 'LeetCode #70 (Climbing Stairs)',
    sourceUrl: 'https://leetcode.com/problems/climbing-stairs/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'single_number': () => ({
    description: `Given a **non-empty** array of integers \`nums\`, every element appears twice except for one. Find that single one.

You must implement a solution with a linear runtime complexity and use only constant extra space.`,
    examples: [
      { input: 'nums = [2, 2, 1]', output: '1', explanation: '1 appears once.' },
      { input: 'nums = [4, 1, 2, 1, 2]', output: '4', explanation: '4 appears once.' },
      { input: 'nums = [1]', output: '1', explanation: 'Single element.' },
    ],
    constraints: [
      '1 <= nums.length <= 3 * 10^4',
      '-3 * 10^4 <= nums[i] <= 3 * 10^4',
      'Each element in the array appears twice except for one element which appears only once',
    ],
    starterCode: `def solve(nums: list) -> int:
    res = 0
    for x in nums:
        res ^= x
    return res

# Local test:
print("Single Number:", solve([4, 1, 2, 1, 2]))
`,
    testCases: [
      { input: '([2, 2, 1])', expected: '1', explanation: '1 is unique' },
      { input: '([4, 1, 2, 1, 2])', expected: '4', explanation: '4 is unique' },
      { input: '([1])', expected: '1', explanation: 'Single element array' },
    ],
    editorial: {
      approach: 'Bitwise XOR operation cancels duplicate numbers because `x ^ x = 0` and `0 ^ x = x`.',
      complexity: 'Time: O(N) | Space: O(1)',
    },
    referenceImplementation: (nums: number[]) => nums.reduce((acc, x) => acc ^ x, 0),
    sourceAttribution: 'LeetCode #136 (Single Number)',
    sourceUrl: 'https://leetcode.com/problems/single-number/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),

  'valid_palindrome': () => ({
    description: `A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`True\` if it is a palindrome, or \`False\` otherwise.`,
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: 'True', explanation: '"amanaplanacanalpanama" is a palindrome.' },
      { input: 's = "race a car"', output: 'False', explanation: '"raceacar" is not a palindrome.' },
      { input: 's = " "', output: 'True', explanation: 'Empty string after removing non-alphanumeric characters reads same forward and backward.' },
    ],
    constraints: [
      '1 <= s.length <= 2 * 10^5',
      's consists only of printable ASCII characters',
    ],
    starterCode: `def solve(s: str) -> bool:
    filtered = ''.join(c.lower() for c in s if c.isalnum())
    return filtered == filtered[::-1]

# Local test:
print("Is palindrome?:", solve("A man, a plan, a canal: Panama"))
`,
    testCases: [
      { input: '("A man, a plan, a canal: Panama")', expected: 'True', explanation: 'Panama palindrome' },
      { input: '("race a car")', expected: 'False', explanation: 'Not a palindrome' },
      { input: '(" ")', expected: 'True', explanation: 'Empty after filter' },
    ],
    editorial: {
      approach: 'Filter to alphanumeric characters, convert to lowercase, and check two-pointer equality from outside in.',
      complexity: 'Time: O(N) | Space: O(1) or O(N)',
    },
    referenceImplementation: (s: string) => {
      const filtered = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return filtered === filtered.split('').reverse().join('');
    },
    sourceAttribution: 'LeetCode #125 (Valid Palindrome)',
    sourceUrl: 'https://leetcode.com/problems/valid-palindrome/',
    isCanonicalVerified: true,
    isApAuthored: false,
    verificationStatus: 'verified',
  }),
};

// -------------------------------------------------------------
// Authentic Problem Detail Resolver
// -------------------------------------------------------------
export function getProblemDetails(q: Question): ProblemDetail {
  const title = (q.title || '').trim();
  const titleLower = title.toLowerCase();

  // 1. Exact canonical preset lookups
  if (titleLower.includes('even or odd') || titleLower.includes('odd or even')) {
    return canonicalPresets['even_or_odd'](q);
  }
  if (titleLower.includes('last digit')) {
    return canonicalPresets['last_digit'](q);
  }
  if (titleLower.includes('count digit')) {
    return canonicalPresets['count_digits'](q);
  }
  if (titleLower.includes('reverse a number') || titleLower.includes('reverse digit') || titleLower === 'reverse integer') {
    return canonicalPresets['reverse_number'](q);
  }
  if (titleLower.includes('power of a number') || titleLower.includes('power of numbers')) {
    return canonicalPresets['power_number'](q);
  }
  if (titleLower.includes('gcd') || titleLower.includes('greatest common divisor')) {
    return canonicalPresets['gcd'](q);
  }
  if (titleLower.includes('all divisor') || titleLower.includes('print all divisor')) {
    return canonicalPresets['divisors'](q);
  }
  if (titleLower === 'prime number' || titleLower.includes('prime number')) {
    return canonicalPresets['prime'](q);
  }
  if (titleLower.includes('armstrong')) {
    return canonicalPresets['armstrong'](q);
  }
  if (titleLower.includes('check palindrome of number') || titleLower.includes('palindrome number')) {
    return canonicalPresets['palindrome_number'](q);
  }
  if (titleLower.includes('square root') || titleLower === 'sqrt(x)') {
    return canonicalPresets['square_root'](q);
  }
  if (titleLower.includes('perfect number')) {
    return canonicalPresets['perfect_number'](q);
  }
  if (titleLower.includes('maximum and minimum element in array') || titleLower.includes('min and max')) {
    return canonicalPresets['min_max_array'](q);
  }
  if (titleLower.includes('third largest')) {
    return canonicalPresets['third_largest'](q);
  }
  if (titleLower.includes('search an element')) {
    return canonicalPresets['search_element'](q);
  }
  if (titleLower.includes('missing number')) {
    return canonicalPresets['missing_number'](q);
  }
  if (titleLower.includes('sort an array of 0s') || titleLower.includes('0s , 1s and 2s') || titleLower.includes('sort colors')) {
    return canonicalPresets['sort_012'](q);
  }
  if (titleLower.includes('minimum add to make parentheses valid') || titleLower.includes('minimum add')) {
    return canonicalPresets['parentheses_min_add'](q);
  }
  if (titleLower.includes('two sum') || titleLower.includes('pair with given sum') || titleLower.includes('key pair')) {
    return canonicalPresets['two_sum'](q);
  }
  if (titleLower.includes('3 sum') || titleLower.includes('triplet sum') || titleLower === '3sum') {
    return canonicalPresets['three_sum'](q);
  }
  if (titleLower.includes('average of divisible') || titleLower.includes('average of numbers divisible')) {
    return canonicalPresets['average_of_divisible_numbers'](q);
  }
  if (titleLower === 'valid parentheses' || titleLower.includes('valid parentheses')) {
    return canonicalPresets['valid_parentheses'](q);
  }
  if (titleLower === 'binary search' || titleLower.includes('binary search')) {
    return canonicalPresets['binary_search'](q);
  }
  if (titleLower === 'maximum subarray' || titleLower.includes('maximum subarray')) {
    return canonicalPresets['maximum_subarray'](q);
  }
  if (titleLower === 'contains duplicate' || titleLower.includes('contains duplicate')) {
    return canonicalPresets['contains_duplicate'](q);
  }
  if (titleLower.includes('best time to buy and sell stock')) {
    return canonicalPresets['best_time_to_buy_and_sell_stock'](q);
  }
  if (titleLower === 'climbing stairs' || titleLower.includes('climbing stairs')) {
    return canonicalPresets['climbing_stairs'](q);
  }
  if (titleLower === 'single number' || titleLower.includes('single number')) {
    return canonicalPresets['single_number'](q);
  }
  if (titleLower === 'valid palindrome' || titleLower.includes('valid palindrome')) {
    return canonicalPresets['valid_palindrome'](q);
  }

  // 2. Authentic Fallback for Non-Canonical Problems
  // CRITICAL: NEVER invent fake examples, fake expected outputs, or dummy test cases.
  const hasExternalLink = Boolean(q.practice_link && q.practice_link.startsWith('http'));
  const attribution = q.platform ? `${q.platform} Problem Reference` : 'External Reference';

  return {
    description: `### ${title}

**Source Platform:** ${q.platform || 'Curated Coding Sheet'}  
**Difficulty Tier:** ${q.difficulty || 'Medium'}  
${q.pattern_name ? `**Pattern / Topic:** ${q.pattern_name}` : ''}

${hasExternalLink 
  ? `This problem is sourced from [${q.platform || 'Official Judge'}](${q.practice_link}). Complete your practice using the official link or submit your implementation below.` 
  : (q.hint_link ? `**Context & Notes:**\n${q.hint_link}` : `Practice this problem as part of your ${q.track_slug || 'learning'} curriculum.`)}

> **Verification Status: ${hasExternalLink ? 'Partially Verified (External Judge Reference)' : 'Unverified (Awaiting Verified Test Suite)'}**  
> Test cases for this problem are managed via the external judge platform. To maintain strict data integrity, Ap Workspace does not synthesize placeholder test inputs.`,
    examples: [],
    constraints: [
      `Curriculum Track: ${q.track_slug || 'General DSA'}`,
      `Difficulty tier: ${q.difficulty || 'Medium'}`,
      hasExternalLink ? `External Judge: ${q.platform}` : 'Awaiting verified community test harness',
    ],
    starterCode: `def solve():
    """
    Problem: ${title}
    Source: ${q.platform || 'Coding Sheet'}
    Difficulty: ${q.difficulty}
    
    Write your optimal solution below.
    Use the official external judge link to submit against complete test suites.
    """
    pass

# Execution / Verification:
print("Executing solution for:", "${title}")
solve()
`,
    testCases: [],
    editorial: {
      approach: hasExternalLink
        ? `Refer to official discussion and solutions on ${q.platform} at ${q.practice_link}.`
        : 'Analyze problem constraints and develop optimal approach.',
      complexity: 'Consult problem specifications on judge platform.',
    },
    sourceAttribution: attribution,
    sourceUrl: q.practice_link,
    isApAuthored: false,
    isCanonicalVerified: false,
    verificationStatus: hasExternalLink ? 'partially_verified' : 'unverified',
  };
}

export function getStarterCode(q: Question, language: string = 'python', detail?: ProblemDetail): string {
  const d = detail || getProblemDetails(q);
  const lang = (language || 'python').toLowerCase();

  if (lang === 'java') {
    if (d.starterCodeJava) return d.starterCodeJava;
    const key = (q.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (key.includes('even_or_odd') || (key.includes('even') && key.includes('odd'))) {
      return `import java.util.*;\n\npublic class Solution {\n    public static String solve(int n) {\n        return (n % 2 == 0) ? "Even" : "Odd";\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            System.out.println(solve(n));\n        }\n    }\n}\n`;
    }
    return `import java.util.*;\n\npublic class Solution {\n    /**\n     * ${q.title}\n     * Difficulty: ${q.difficulty}\n     * Platform: ${q.platform || 'LeetCode'}\n     */\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            String line = sc.nextLine();\n            System.out.println(line);\n        }\n    }\n}\n`;
  }

  if (lang === 'cpp' || lang === 'c++') {
    if (d.starterCodeCpp) return d.starterCodeCpp;
    const key = (q.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (key.includes('even_or_odd') || (key.includes('even') && key.includes('odd'))) {
      return `#include <iostream>\n#include <string>\n\nusing namespace std;\n\nstring solve(int n) {\n    return (n % 2 == 0) ? "Even" : "Odd";\n}\n\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << solve(n) << endl;\n    }\n    return 0;\n}\n`;
    }
    return `#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\n/**\n * ${q.title}\n * Difficulty: ${q.difficulty}\n * Platform: ${q.platform || 'LeetCode'}\n */\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n\n    string line;\n    if (getline(cin, line)) {\n        cout << line << endl;\n    }\n    return 0;\n}\n`;
  }

  // Default Python
  return d.starterCode;
}
