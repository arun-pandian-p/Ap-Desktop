#!/usr/bin/env python3
"""
Ap Restricted Python Worker
Hardened execution harness with audit hooks, resource isolation, and test runner.
Invoked via: python -I -S -B worker.py
Input is passed via stdin as JSON: {"code": "...", "test_cases": [{"input": "...", "expected": "..."}]}
or as raw Python code.
"""

import sys
import time
import json
import io
import traceback
import tracemalloc

# Security Exceptions and Audit Hook (Defence-in-Depth)
class SecurityException(RuntimeError):
    pass

class NetworkSecurityException(SecurityException):
    pass

def audit_hook(event, args):
    # Deny socket/network calls
    if event.startswith('socket.') or event.startswith('urllib.'):
        raise NetworkSecurityException(f"NetworkSecurityException: Network access blocked by Ap sandbox: {event}")
    # Deny subprocess creation
    if event.startswith('subprocess.') or event.startswith('os.system') or event.startswith('os.posix_spawn'):
        raise SecurityException(f"SecurityException: Process spawning blocked by Ap sandbox: {event}")
    # Deny ctypes / arbitrary dynamic linking
    if event.startswith('ctypes.'):
        raise SecurityException(f"SecurityException: Dynamic memory inspection blocked by Ap sandbox: {event}")
    # Deny file deletions
    if event in ('os.remove', 'os.unlink', 'os.rmdir', 'shutil.rmtree'):
        raise SecurityException(f"SecurityException: File deletion blocked by Ap sandbox: {event}")

try:
    sys.addaudithook(audit_hook)
except AttributeError:
    pass

def execute_payload(payload):
    code_str = payload.get('code', '') if isinstance(payload, dict) else str(payload)
    test_cases = payload.get('test_cases', []) if isinstance(payload, dict) else []

    # Check for syntax errors first
    try:
        compiled_code = compile(code_str, '<solution.py>', 'exec')
    except SyntaxError as se:
        err_line = se.lineno or 1
        err_msg = f"SyntaxError on line {err_line}: {se.msg}\n"
        if se.text:
            err_msg += f"  {se.text.strip()}\n  {' ' * max(0, (se.offset or 1) - 1)}^\n"
        return {
            "status": "Compilation Error",
            "runtime_ms": 0.0,
            "memory_kb": 0.0,
            "stdout": "",
            "stderr": err_msg,
            "test_cases_passed": 0,
            "total_test_cases": len(test_cases),
            "test_details": [
                {"input": tc.get("input", ""), "expected": tc.get("expected", ""), "actual": "Syntax Error", "passed": False}
                for tc in test_cases
            ]
        }

    start_time = time.perf_counter()
    tracemalloc.start()

    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr

    sys.stdout = stdout_buffer
    sys.stderr = stderr_buffer

    exec_globals = {
        "__builtins__": {
            k: v for k, v in __builtins__.__dict__.items()
            if k not in ('breakpoint', 'quit', 'exit')
        },
        "SecurityException": SecurityException,
        "NetworkSecurityException": NetworkSecurityException,
    }

    try:
        import os
        class SafeEnviron:
            def __getitem__(self, item):
                raise SecurityException("SecurityException: os.environ inspection blocked by Ap sandbox")
            def __repr__(self):
                raise SecurityException("SecurityException: os.environ inspection blocked by Ap sandbox")
            def __str__(self):
                raise SecurityException("SecurityException: os.environ inspection blocked by Ap sandbox")
            def get(self, *args, **kwargs):
                raise SecurityException("SecurityException: os.environ inspection blocked by Ap sandbox")
        os.environ = SafeEnviron()
        def blocked_fs(*args, **kwargs):
            raise SecurityException("SecurityException: File system operations blocked by Ap sandbox")
        os.remove = blocked_fs
        os.unlink = blocked_fs
        os.rmdir = blocked_fs
    except Exception:
        pass

    status = "Accepted"
    test_details = []
    test_cases_passed = 0

    def clean_str(s):
        if s is None:
            return ""
        st = str(s).strip()
        while len(st) >= 2 and ((st[0] == '"' and st[-1] == '"') or (st[0] == "'" and st[-1] == "'") or (st[0] == '`' and st[-1] == '`')):
            st = st[1:-1].strip()
        return st

    def normalize_val(val):
        if val is None:
            return ""
        if isinstance(val, (int, float, bool, list, dict)):
            return json.dumps(val, sort_keys=True)
        val_str = str(val).strip()
        try:
            parsed = json.loads(val_str)
            if isinstance(parsed, (int, float, bool, list, dict)):
                return json.dumps(parsed, sort_keys=True)
            elif isinstance(parsed, str):
                return clean_str(parsed)
        except Exception:
            pass
        return clean_str(val_str)

    try:
        exec(compiled_code, exec_globals)

        # If test cases were supplied, run each test case against the defined solve/solution function
        if test_cases:
            func = None
            for fn_name in ['solve', 'solution', 'twoSum', 'maxProfit', 'isPalindrome', 'isValid', 'merge']:
                if fn_name in exec_globals and callable(exec_globals[fn_name]):
                    func = exec_globals[fn_name]
                    break
            
            if not func:
                # Find first user-defined callable function
                for k, v in exec_globals.items():
                    if callable(v) and not k.startswith('_') and k not in ('SecurityException', 'NetworkSecurityException'):
                        func = v
                        break

            if func:
                import re
                for tc in test_cases:
                    raw_inp = tc.get('input', '')
                    expected = tc.get('expected', '')
                    try:
                        actual = None
                        if not isinstance(raw_inp, str):
                            if isinstance(raw_inp, list):
                                actual = func(*raw_inp)
                            else:
                                actual = func(raw_inp)
                        else:
                            clean_inp = raw_inp.strip()
                            # Clean variable bindings e.g., 'nums = [2,7,11,15], target = 9' -> '[2,7,11,15], 9'
                            clean_no_vars = re.sub(r'(?:^|,\s*)[a-zA-Z_]\w*\s*=\s*', lambda m: ',' if m.group(0).startswith(',') else '', clean_inp)
                            
                            called = False
                            for expr in [clean_inp, clean_no_vars, f"({clean_no_vars})", f"[{clean_no_vars}]"]:
                                try:
                                    parsed_args = eval(expr, {"__builtins__": {
                                        "true": True, "false": False, "null": None,
                                        "True": True, "False": False, "None": None,
                                        "list": list, "dict": dict, "set": set, "tuple": tuple
                                    }})
                                    if isinstance(parsed_args, tuple):
                                        actual = func(*parsed_args)
                                    elif isinstance(parsed_args, list) and expr.startswith('['):
                                        actual = func(parsed_args)
                                    else:
                                        actual = func(parsed_args)
                                    called = True
                                    break
                                except Exception:
                                    continue
                            
                            if not called:
                                actual = func(clean_inp)

                        actual_norm = normalize_val(actual)
                        expected_norm = normalize_val(expected)
                        clean_act = clean_str(actual)
                        clean_exp = clean_str(expected)
                        raw_act = str(actual).strip()
                        raw_exp = str(expected).strip()

                        passed = (
                            (actual_norm == expected_norm)
                            or (clean_act == clean_exp)
                            or (raw_act == raw_exp)
                            or (clean_act.lower() == clean_exp.lower() if clean_act and clean_exp and clean_act.isalpha() and clean_exp.isalpha() else False)
                        )
                        if passed:
                            test_cases_passed += 1
                        else:
                            status = "Wrong Answer"

                        test_details.append({
                            "input": str(raw_inp),
                            "expected": str(expected),
                            "actual": str(actual),
                            "passed": passed
                        })
                    except Exception as te:
                        status = "Runtime Error"
                        test_details.append({
                            "input": str(raw_inp),
                            "expected": str(expected),
                            "actual": f"Error: {te}",
                            "passed": False
                        })
            else:
                # No function found, compare stdout if expected output exists
                out = stdout_buffer.getvalue().strip()
                clean_out = clean_str(out)
                for tc in test_cases:
                    exp = str(tc.get('expected', '')).strip()
                    clean_exp = clean_str(exp)
                    passed = (
                        (normalize_val(out) == normalize_val(exp))
                        or (clean_out == clean_exp)
                        or (out == exp)
                        or (clean_exp in clean_out)
                    )
                    if passed:
                        test_cases_passed += 1
                    else:
                        status = "Wrong Answer"
                    test_details.append({
                        "input": str(tc.get('input', '')),
                        "expected": exp,
                        "actual": out,
                        "passed": passed
                    })
    except Exception as e:
        status = "Runtime Error"
        traceback.print_exc(file=stderr_buffer)
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    memory_kb = round(peak_mem / 1024, 1)

    return {
        "status": status,
        "runtime_ms": elapsed_ms,
        "memory_kb": memory_kb,
        "stdout": stdout_buffer.getvalue(),
        "stderr": stderr_buffer.getvalue(),
        "test_cases_passed": test_cases_passed if test_cases else (1 if status == "Accepted" else 0),
        "total_test_cases": len(test_cases) if test_cases else 1,
        "test_details": test_details if test_cases else [
            {"input": "Standard Execution", "expected": "Exit Code 0", "actual": status, "passed": status == "Accepted"}
        ]
    }

def main():
    raw_in = sys.stdin.read().strip()
    if not raw_in and len(sys.argv) > 1:
        raw_in = sys.argv[1]

    if not raw_in:
        print(json.dumps({
            "status": "Accepted",
            "runtime_ms": 0.0,
            "memory_kb": 0.0,
            "stdout": "",
            "stderr": "",
            "test_cases_passed": 0,
            "total_test_cases": 0,
            "test_details": []
        }))
        return

    try:
        payload = json.loads(raw_in)
    except Exception:
        payload = {"code": raw_in, "test_cases": []}

    res = execute_payload(payload)
    print(json.dumps(res))

if __name__ == '__main__':
    main()
