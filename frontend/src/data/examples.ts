import type { Language } from '../types/analysis';

export interface CodeExample {
  id: string;
  name: string;
  language: Language;
  expectedComplexity: string;
  code: string;
}

export const EXAMPLES: CodeExample[] = [
  // PYTHON
  {
    id: 'py_nested_duplicates',
    name: 'Python: Nested Loop Duplicates (O(n²))',
    language: 'python',
    expectedComplexity: 'O(n²)',
    code: `def find_duplicates(numbers):
    duplicates = []
    # Nested loops check every pair: O(n²) time
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            if numbers[i] == numbers[j] and numbers[i] not in duplicates:
                duplicates.append(numbers[i])
    return duplicates

# Test run
items = [1, 2, 3, 2, 4, 5, 1, 6, 3]
print("Duplicates found:", find_duplicates(items))
`,
  },
  {
    id: 'py_binary_search',
    name: 'Python: Binary Search (O(log n))',
    language: 'python',
    expectedComplexity: 'O(log n)',
    code: `def binary_search(arr, target):
    \"\"\"
    Searches for target in sorted array using binary halving.
    Time Complexity: O(log n) | Space Complexity: O(1)
    \"\"\"
    low = 0
    high = len(arr) - 1

    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
            
    return -1

# Example array (must be sorted)
primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
idx = binary_search(primes, 13)
print(f"Found 13 at index: {idx}")
`,
  },
  {
    id: 'py_recursive_fib',
    name: 'Python: Recursive Fibonacci (O(2ⁿ))',
    language: 'python',
    expectedComplexity: 'O(2ⁿ)',
    code: `def fibonacci_tree(n):
    \"\"\"
    Naive recursive Fibonacci with dual branching.
    Produces binary call tree resulting in exponential O(2ⁿ) execution time.
    \"\"\"
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    # Exponential branches:
    return fibonacci_tree(n - 1) + fibonacci_tree(n - 2)

print("fib(8) =", fibonacci_tree(8))
`,
  },
  {
    id: 'py_issues_security',
    name: 'Python: Code Smells & Security Vulnerabilities',
    language: 'python',
    expectedComplexity: 'O(n)',
    code: `def process_user_data(payload, default_list=[]):
    # Bug 1: Mutable default argument retains state across invocations
    default_list.append(payload)
    
    # Bug 2: Shadowing built-in names
    id = 1001
    list = [1, 2, 3]
    
    # Bug 3: Critical Security Vulnerability (Arbitrary Remote Code Execution)
    if "calc" in payload:
        result = eval(payload["calc"])
    
    # Bug 4: Bare except suppresses system interruptions and hides bugs
    try:
        data = int(payload.get("age", 0))
    except:
        data = -1
        
    return default_list
`,
  },

  // JAVASCRIPT
  {
    id: 'js_nested_duplicates',
    name: 'JavaScript: Quadratic Array Scan (O(n²))',
    language: 'javascript',
    expectedComplexity: 'O(n²)',
    code: `function findDuplicates(items) {
    var duplicates = []; // Antipattern: legacy 'var'
    for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
            // Antipattern: loose equality ==
            if (items[i] == items[j] && !duplicates.includes(items[i])) {
                duplicates.push(items[i]);
            }
        }
    }
    console.log("Found duplicates:", duplicates); // Antipattern: console.log in prod
    return duplicates;
}
`,
  },
  {
    id: 'js_binary_search',
    name: 'JavaScript: Binary Search (O(log n))',
    language: 'javascript',
    expectedComplexity: 'O(log n)',
    code: `function binarySearch(sortedArray, target) {
    let low = 0;
    let high = sortedArray.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (sortedArray[mid] === target) {
            return mid;
        } else if (sortedArray[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}

const scores = [10, 24, 38, 55, 72, 89, 94];
const targetIdx = binarySearch(scores, 55);
`,
  },

  // JAVA
  {
    id: 'java_nested_loop',
    name: 'Java: Quadratic String Concatenation (O(n²))',
    language: 'java',
    expectedComplexity: 'O(n²)',
    code: `import java.util.*;

public class InefficientProcessor {
    public static String buildReport(List<String> items) {
        String result = "";
        // Antipattern: String concatenation inside nested iterations
        for (int i = 0; i < items.size(); i++) {
            for (int j = 0; j < items.size(); j++) {
                if (items.get(i).equals(items.get(j))) {
                    result += "[" + items.get(i) + "]"; // Allocates new string every iteration
                }
            }
        }
        System.out.println("Generated report length: " + result.length());
        return result;
    }
}
`,
  },

  // C++
  {
    id: 'cpp_nested_search',
    name: 'C++: Vector Pair Matching (O(n²))',
    language: 'cpp',
    expectedComplexity: 'O(n²)',
    code: `#include <iostream>
#include <vector>

using namespace std; // Antipattern: namespace pollution

vector<int> findMatchingPairs(vector<int> numbers) {
    vector<int> duplicates;
    for (size_t i = 0; i < numbers.size(); ++i) {
        for (size_t j = i + 1; j < numbers.size(); ++j) {
            if (numbers[i] == numbers[j]) {
                duplicates.push_back(numbers[i]);
            }
        }
    }
    return duplicates;
}
`,
  }
];
