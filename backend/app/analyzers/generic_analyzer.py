import re
from typing import List, Dict, Any, Tuple, Optional
from app.models.schemas import CodeIssue, CodeSuggestion, AnalysisMetrics

def analyze_generic_code(
    code_str: str, 
    language: str
) -> Tuple[str, str, int, str, List[CodeIssue], List[CodeSuggestion], AnalysisMetrics, Optional[str], Optional[str]]:
    """
    Static analyzer for JavaScript, Java, and C++ code using lexical and structural analysis.
    """
    issues: List[CodeIssue] = []
    suggestions: List[CodeSuggestion] = []
    lines = code_str.splitlines()
    total_lines = len(lines)
    blank_lines = len([l for l in lines if not l.strip()])
    
    # Calculate comment lines and stripped code
    comment_lines = 0
    in_block_comment = False
    cleaned_lines = []
    
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
            
        if in_block_comment:
            comment_lines += 1
            if "*/" in stripped:
                in_block_comment = False
            cleaned_lines.append("")
            continue
            
        if stripped.startswith("/*"):
            comment_lines += 1
            if "*/" not in stripped:
                in_block_comment = True
            cleaned_lines.append("")
            continue
            
        if stripped.startswith("//"):
            comment_lines += 1
            cleaned_lines.append("")
            continue
            
        # Strip inline comment
        clean = re.sub(r'//.*$', '', line)
        cleaned_lines.append(clean)
        
    code_lines = max(1, total_lines - blank_lines - comment_lines)
    full_cleaned = "\n".join(cleaned_lines)

    # 1. Structural metrics
    loop_count = 0
    max_loop_depth = 0
    current_loop_depth = 0
    brace_depth = 0
    max_brace_depth = 0
    cyclomatic_complexity = 1
    function_count = 0
    class_count = 0
    recursion_detected = False
    sorting_detected = bool(re.search(r'\b(sort|sorted|Arrays\.sort|Collections\.sort|std::sort)\b', full_cleaned))
    binary_search_pattern = bool(re.search(r'(\bmid\b|\blow\b|\bhigh\b|\bleft\b|\bright\b).*(\/|>>)\s*2', full_cleaned))

    # Regex patterns per language
    if language == "javascript":
        fn_pattern = re.compile(r'(function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(async\s*)?\([^)]*\)\s*=>|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)')
        class_pattern = re.compile(r'\bclass\s+([a-zA-Z0-9_$]+)')
    elif language == "java":
        fn_pattern = re.compile(r'(public|private|protected|static|\s)+[\w<>\[\]]+\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*(\{)?')
        class_pattern = re.compile(r'\b(class|interface|enum)\s+([a-zA-Z0-9_$]+)')
    else: # cpp
        fn_pattern = re.compile(r'[\w:<>&*]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(const)?\s*\{')
        class_pattern = re.compile(r'\b(class|struct)\s+([a-zA-Z0-9_]+)')

    # Find functions
    detected_funcs = []
    for match in fn_pattern.finditer(full_cleaned):
        name = match.group(2) or match.group(3) or match.group(5) or "fn"
        if name not in ('if', 'for', 'while', 'switch', 'catch'):
            detected_funcs.append(name)
    function_count = max(1 if code_lines > 3 else 0, len(detected_funcs))

    # Find classes
    classes = class_pattern.findall(full_cleaned)
    class_count = len(classes)

    # Check for recursion
    for fname in detected_funcs:
        if fname and len(fname) > 1:
            call_matches = re.findall(rf'\b{re.escape(fname)}\s*\(', full_cleaned)
            # 1 definition + calls
            if len(call_matches) > 1:
                recursion_detected = True
                break

    # Line-by-line depth & branch tracking
    loop_start_regex = re.compile(r'\b(for|while|do)\b\s*(\(.*?\)|{)?')
    branch_regex = re.compile(r'\b(if|else\s+if|case|catch)\b|\?|&&|\|\|')

    loop_stack = []

    for idx, line in enumerate(cleaned_lines, start=1):
        branches = branch_regex.findall(line)
        cyclomatic_complexity += len(branches)

        # Check for loop keywords
        if loop_start_regex.search(line):
            loop_count += 1
            current_loop_depth += 1
            if current_loop_depth > max_loop_depth:
                max_loop_depth = current_loop_depth
            loop_stack.append(current_loop_depth)

        # Track braces
        open_braces = line.count('{')
        close_braces = line.count('}')
        brace_depth += open_braces - close_braces
        if brace_depth > max_brace_depth:
            max_brace_depth = brace_depth

        if close_braces > 0 and current_loop_depth > 0:
            for _ in range(min(close_braces, current_loop_depth)):
                current_loop_depth = max(0, current_loop_depth - 1)

    # 2. Specific Language Rule & Lint Checking
    for idx, line in enumerate(cleaned_lines, start=1):
        # JavaScript rules
        if language == "javascript":
            if re.search(r'\bvar\s+[a-zA-Z0-9_$]+', line):
                issues.append(CodeIssue(
                    severity="warning",
                    title="Legacy 'var' Declaration",
                    description="Use block-scoped 'let' or 'const' instead of function-scoped 'var' to prevent variable hoisting and scoping leaks.",
                    line=idx,
                    rule_id="JS_USE_CONST_LET"
                ))
            if re.search(r'[^=!]={2}[^=]', line):
                issues.append(CodeIssue(
                    severity="warning",
                    title="Loose Equality Operator (==)",
                    description="Use strict equality '===' instead of loose equality '==' to prevent unexpected type coercion bugs.",
                    line=idx,
                    rule_id="JS_EQEQEQ"
                ))
            if "eval(" in line:
                issues.append(CodeIssue(
                    severity="critical",
                    title="Dangerous 'eval()' Execution",
                    description="Using 'eval()' introduces high-risk arbitrary script execution vulnerabilities. Use JSON.parse or structured mapping.",
                    line=idx,
                    rule_id="JS_NO_EVAL"
                ))
            if "console.log(" in line:
                issues.append(CodeIssue(
                    severity="suggestion",
                    title="Console Log Statement",
                    description="Remove debugging 'console.log' statements prior to production deployment.",
                    line=idx,
                    rule_id="JS_NO_CONSOLE"
                ))

        # Java rules
        elif language == "java":
            if re.search(r'\+\s*=\s*|\+\s*".*"', line) and max_loop_depth > 0:
                issues.append(CodeIssue(
                    severity="warning",
                    title="String Concatenation in Loop",
                    description="Using '+' for string concatenation inside loops allocates new String instances each iteration (O(n²)). Use 'StringBuilder' instead.",
                    line=idx,
                    rule_id="JAVA_STRING_BUILDER"
                ))
            if "System.out.println" in line:
                issues.append(CodeIssue(
                    severity="suggestion",
                    title="System.out.println in Production Code",
                    description="Use a structured logging framework (e.g., SLF4J, Logback) instead of standard stdout.",
                    line=idx,
                    rule_id="JAVA_NO_SOUT"
                ))
            if re.search(r'catch\s*\(\s*Exception\s+\w+\s*\)\s*\{\s*\}', line):
                issues.append(CodeIssue(
                    severity="critical",
                    title="Empty Catch Block",
                    description="Swallowing exceptions without logging or recovery silently suppresses failures and complicates debugging.",
                    line=idx,
                    rule_id="JAVA_EMPTY_CATCH"
                ))

        # C++ rules
        elif language == "cpp":
            if "using namespace std;" in line:
                issues.append(CodeIssue(
                    severity="warning",
                    title="'using namespace std;' Antipattern",
                    description="Pollutes global namespace and can lead to silent symbol collisions. Qualify with 'std::' explicitly.",
                    line=idx,
                    rule_id="CPP_NO_USING_STD"
                ))
            if re.search(r'\bnew\s+[a-zA-Z0-9_]+', line) and "delete" not in full_cleaned:
                issues.append(CodeIssue(
                    severity="warning",
                    title="Manual Dynamic Memory Allocation ('new')",
                    description="Raw pointers with 'new' risk memory leaks. Use RAII smart pointers like 'std::unique_ptr' or 'std::make_shared'.",
                    line=idx,
                    rule_id="CPP_USE_SMART_PTR"
                ))
            if "gets(" in line:
                issues.append(CodeIssue(
                    severity="critical",
                    title="Insecure 'gets()' Function",
                    description="'gets()' does not perform buffer bounds checking and is susceptible to buffer overflow exploits. Use 'fgets' or 'std::cin'.",
                    line=idx,
                    rule_id="CPP_INSECURE_GETS"
                ))

    # General Nested Loop Issue
    if max_loop_depth >= 2:
        issues.append(CodeIssue(
            severity="warning",
            title=f"Nested Loops Detected ({max_loop_depth} levels)",
            description=f"Iterating {max_loop_depth} nested loops generates polynomial O(n^{max_loop_depth}) execution time. Consider indexing items into hash tables or maps.",
            line=1,
            rule_id="PERF_NESTED_LOOP"
        ))

    # General Recursion Issue
    if recursion_detected:
        issues.append(CodeIssue(
            severity="suggestion",
            title="Recursive Implementation Detected",
            description="Verify termination base conditions to prevent call stack overflow.",
            line=1,
            rule_id="ALG_RECURSION"
        ))

    # 3. Time & Space Complexity Heuristics
    time_comp = "O(1)"
    space_comp = "O(1)"

    if max_loop_depth >= 3:
        time_comp = f"O(n^{max_loop_depth})"
    elif max_loop_depth == 2:
        time_comp = "O(n²)"
    elif sorting_detected:
        time_comp = "O(n log n)" if loop_count == 0 else "O(n² log n)"
    elif binary_search_pattern:
        time_comp = "O(log n)"
    elif recursion_detected:
        # Check if multiple recursive invocations
        multi_rec = len(re.findall(r'(\w+)\s*\([^)]*\).*?\1\s*\(', full_cleaned)) > 0
        if multi_rec:
            time_comp = "O(2ⁿ)"
            space_comp = "O(n)"
        else:
            time_comp = "O(n)"
            space_comp = "O(n)"
    elif loop_count >= 1:
        time_comp = "O(n)"

    # Space complexity
    if re.search(r'\[\s*\]|new\s+(ArrayList|HashMap|HashSet|vector|list|int\[\])', full_cleaned):
        space_comp = "O(n)"

    # 4. Quality Score Calculation
    score = 100
    for issue in issues:
        if issue.severity == "critical":
            score -= 25
        elif issue.severity == "warning":
            score -= 10
        elif issue.severity == "suggestion":
            score -= 4

    if cyclomatic_complexity > 12:
        score -= 12
    elif cyclomatic_complexity > 6:
        score -= 6

    if max_brace_depth > 4:
        score -= 10

    if comment_lines == 0 and code_lines > 12:
        score -= 5
        issues.append(CodeIssue(
            severity="suggestion",
            title="Missing Inline Documentation",
            description="Consider adding explanatory comments to improve code readability and maintainability.",
            line=1,
            rule_id="DOC_MISSING"
        ))

    score = max(15, min(100, score))

    # 5. Suggestions
    if max_loop_depth >= 2:
        if language == "javascript":
            suggestions.append(CodeSuggestion(
                title="Optimize with Set / Map",
                description="Use JavaScript `Set` or `Map` for O(1) membership lookups instead of nested iterations or `Array.includes()`."
            ))
        elif language == "java":
            suggestions.append(CodeSuggestion(
                title="Optimize with HashSet / HashMap",
                description="Use `HashSet<T>` for O(1) containment checks to reduce nested loop execution from O(n²) to O(n)."
            ))
        elif language == "cpp":
            suggestions.append(CodeSuggestion(
                title="Optimize with std::unordered_set",
                description="Replace nested scans with `std::unordered_set<T>` for average constant O(1) lookup overhead."
            ))

    if recursion_detected:
        suggestions.append(CodeSuggestion(
            title="Consider Iterative or Memoized Approach",
            description="Transform deep recursion into an iterative loop or memoization table to eliminate call-stack overflow risks."
        ))

    suggestions.append(CodeSuggestion(
        title="Comprehensive Unit Tests",
        description="Add automated tests covering boundary conditions, empty collections, and large datasets."
    ))

    # 6. Optimized Code Generation per language
    optimized_code = None
    opt_explanation = None

    if language == "javascript":
        if ("duplicate" in code_str.lower() or max_loop_depth >= 2):
            optimized_code = """// Optimized Duplicate Finder (O(n) Time, O(n) Space)
function findDuplicates(items) {
    const seen = new Set();
    const duplicates = new Set();
    
    for (const item of items) {
        if (seen.has(item)) {
            duplicates.add(item);
        } else {
            seen.add(item);
        }
    }
    return Array.from(duplicates);
}
"""
            opt_explanation = "Replaced O(n²) nested loop or linear scan with a single iteration using native JS `Set`. Lookups are O(1), achieving O(n) linear performance."

    elif language == "java":
        if ("duplicate" in code_str.lower() or max_loop_depth >= 2):
            optimized_code = """import java.util.*;

public class DuplicateFinder {
    // Optimized: O(n) Time Complexity, O(n) Auxiliary Space
    public static <T> Set<T> findDuplicates(List<T> list) {
        Set<T> seen = new HashSet<>();
        Set<T> duplicates = new HashSet<>();
        for (T item : list) {
            if (!seen.add(item)) {
                duplicates.add(item);
            }
        }
        return duplicates;
    }
}
"""
            opt_explanation = "Converted nested iteration to a single pass using `HashSet`. Adding to a set returns false if element already exists, operating in O(1) time."

    elif language == "cpp":
        if ("duplicate" in code_str.lower() or max_loop_depth >= 2):
            optimized_code = """#include <iostream>
#include <vector>
#include <unordered_set>

// Optimized: O(n) Time, O(n) Space
std::vector<int> findDuplicates(const std::vector<int>& numbers) {
    std::unordered_set<int> seen;
    std::unordered_set<int> duplicates;
    
    for (int num : numbers) {
        if (seen.find(num) != seen.end()) {
            duplicates.insert(num);
        } else {
            seen.insert(num);
        }
    }
    return std::vector<int>(duplicates.begin(), duplicates.end());
}
"""
            opt_explanation = "Replaced quadratic loop scan with `std::unordered_set`, providing average O(1) lookup and insertion."

    summary = (
        f"Analyzed {code_lines} lines of {language.upper()} code. "
        f"Detected {loop_count} loop structures with max nesting depth of {max_loop_depth}. "
        f"Estimated time complexity: {time_comp}, space complexity: {space_comp}. "
        f"Branching cyclomatic complexity: {cyclomatic_complexity}."
    )

    metrics = AnalysisMetrics(
        lines_of_code=code_lines,
        blank_lines=blank_lines,
        comment_lines=comment_lines,
        cyclomatic_complexity=cyclomatic_complexity,
        max_nesting_depth=max_brace_depth,
        loop_count=loop_count,
        function_count=function_count,
        class_count=class_count,
        recursion_detected=recursion_detected
    )

    return (
        time_comp,
        space_comp,
        score,
        summary,
        issues,
        suggestions,
        metrics,
        optimized_code,
        opt_explanation
    )
