ath Formulas & DSL v1.0.0 🚀
A high-performance Domain-Specific Language (DSL) and advanced math extension built for TurboWarp and Scratch. Designed for complex mathematical evaluation, procedural generation, custom macros, and robust error handling.

📌 Table of Contents
Overview & Execution Mode

Blocks Overview

Environment Settings (pre{...})

Macros & Loops (par[...])

Variables, Dynamic Context & Generation (var, output, random)

Math Library Reference

Error Handling System

1. Overview & Execution Mode
This extension allows users to evaluate complex mathematical expressions, execute procedural loops, and dynamically populate Scratch lists using a concise DSL syntax.

⚠️ Important Requirement: The extension must run in Unsandboxed Mode in TurboWarp to allow direct manipulation of project variables and target stage lists.

2. Blocks Overview
execute DSL [FORMULA] to list [LIST] (Command Block)
Executes the DSL script or macro, clears the target list, and populates it with all outputs generated via output(...).

operation [FORMULA] (Reporter Block)
Evaluates a single math formula or linear expression and returns the resulting number (or error message).

extension version (Reporter Block)
Returns the current version of the extension (1.0.0).

show lib and syntax (Command Block)
Opens an interactive documentation modal window directly inside the editor UI.

3. Environment Settings (pre{...})
Configure environment settings at the very beginning of your script using curly braces:

pre{deg} — Configures all trigonometric functions (sin, cos, tan, asin, acos, atan) to use Degrees.

pre{rad} — Configures trigonometric functions to use Radians (default mode).

4. Macros & Loops (par[...])
The par[...] macro handles repetitive tasks and procedural iterations using the mandatory |$run| separator.

Repeat Loop (N iterations):


par[repeat(6) |$run| ...]
Single Execution:


par[single |$run| ...]
5. Variables, Dynamic Context & Generation (var, output, random)
📌 Variable Declarations (var)
Declare or update variables using the var keyword:


var m = 0;
var a = 5 * 2;
📌 Outputting to Lists (output)
The output(...) command appends the evaluated value of an expression to the target list. Supported nested functions via a balanced parenthesis parser:


pre{deg}; var m = 0; par[repeat(6) |$run| var m = m + 30; output(10 * sin(m))]
🎲 Dynamic Variables & Randomness
Your formulas have access to dynamic environment variables and helpers:

random(min, max) — Generates a random floating-point number between min and max (defaults to 0 and 1).

i — Current loop iteration counter (0, 1, 2, ...).

x / y — Target sprite's X and Y coordinates on stage.

t — Elapsed time in seconds since script execution started.

6. Math Library Reference
The extension includes a broad range of mathematical operations:

Standard Functions: abs(v), sqrt(v), pow(base, exp), floor(v), ceil(v), round(v), min(a, b), max(a, b)

Integer Division (\): Automatically computes floor division (e.g., 10 \ 3 evaluates to 3).

Trigonometry: sin, cos, tan, asin, acos, atan (respects deg and rad modes).

Specialized Functions:

gcd(a, b) — Greatest Common Divisor.

lcm(a, b) — Least Common Multiple.

sign(v) — Returns the sign of a number (-1, 0, 1).

fract(v) — Returns the fractional part of a number (v - floor(v)).

clamp(val, min, max) — Clamps a value within specified bounds.

lerp(a, b, t) — Linear interpolation between a and b.

PI, E — Mathematical constants.

7. Error Handling System
Built-in guardrails prevent project crashes and report error states:

ERROR(0): unknown error — General unexpected runtime exception.

ERROR(1): cannot play looped in operation — Triggers if a macro (par[...]) is invoked inside a Reporter block.

ERROR(2): invalid syntax — Syntax error or unbalanced parentheses in formula.

ERROR(3): infinite loop protection triggered — Safeguard against infinite execution loops.

ERROR(4): list not found or null — Triggers if the target list specified in execute DSL does not exist or is null.
