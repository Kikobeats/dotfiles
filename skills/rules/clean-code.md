# Clean Code Guidelines

## Constants Over Magic Numbers
- Replace hard-coded values with named constants
- Use descriptive constant names that explain the value's purpose
- Keep constants at the top of the file or in a dedicated constants file

## Meaningful Names
- Variables, functions, and classes should reveal their purpose
- Names should explain why something exists and how it's used
- Avoid abbreviations unless they're universally understood

## Comments

Do not add comments. The code must be self-explanatory through naming,
decomposition, and structure. A comment is a last resort for a decision that
genuinely cannot live in the code — an external behavior, a measurement, an
approach already tried and reversed. Reaching for one usually means the code
is not clear enough yet.

- Try the rename or the extracted function first. Most comments are a naming failure.
- Never restate the line below it. If the comment paraphrases the code, delete it.
- Encode ordering and coupling in structure — nesting, types, a single call site — not in a warning comment.
- One fact, one place. A fact asserted in three comments is believed in none.
- No archaeology. Why the old code was wrong goes in the commit, not above the new code.

## Single Responsibility
- Each function should do exactly one thing
- Functions should be small and focused
- If a function needs a comment to explain what it does, it should be split

## DRY (Don't Repeat Yourself)
- Extract repeated code into reusable functions
- Share common logic through proper abstraction
- Maintain single sources of truth

## Clean Structure
- Keep related code together
- Organize code in a logical hierarchy
- Use consistent file and folder naming conventions

## Encapsulation
- Hide implementation details
- Expose clear interfaces
- Move nested conditionals into well-named functions

## Code Quality Maintenance
- Refactor continuously
- Fix technical debt early
- Leave code cleaner than you found it

## Testing
- Write tests before fixing bugs
- Keep tests readable and maintainable
- Test edge cases and error conditions

## Version Control
- Write clear commit messages
- Make small, focused commits
- Use meaningful branch names
