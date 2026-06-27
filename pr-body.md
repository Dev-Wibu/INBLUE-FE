## Summary

- Parse `\n` escape sequences for proper line breaks in code
- Add line numbers to code viewer
- Add copy button for code blocks
- Expand modal width to `max-w-5xl`
- Stack files vertically for better code readability
- Use flex-wrap for expected issues to prevent overflow

## Test plan

- [ ] Open code review problem detail modal
- [ ] Verify code displays with proper line breaks
- [ ] Verify line numbers are shown
- [ ] Verify copy button works
- [ ] Verify expected issues don't overflow
- [ ] Test both light and dark mode
