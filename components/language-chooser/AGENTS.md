## Tests (Unit tests and E2E tests)

- If you can't figure out why a test is failing, stop and inform the programmer. Never change the objectives nor expected outcomes of a test unless explicitly instructed to.
- There are several special case languages, handled in searchResultModifiers.ts and/or called out in the Anomalies and Special Situations section of macrolanguageNotes.md. Be sure not to use any of these languages in general-case tests. Whenever adding tests, also test these special cases if appropriate.
- Avoid running the same exact scenario multiple times. If one test scenario is useful for testing multiple behaviors/outcomes/properties, just run it once and list all of those behaviors in the description.
- Be careful to prevent falsely passing tests. Do sanity checks.
- In e2e tests, be careful to avoid adding tests for behavior which is already covered by tests in a different file.
- You can trust that libraries behave the way they are supposed to; don't write tests for behavior which is entirely handled by a library. E.g. no need to test that MUI components are behaving as specified.
- When adding tests, make sure they are in a test suite where they belong
- When tests involve language searching, search results may come back in batches with delays in between, and lazyload. So the immediate absence of a certain result is not enough to verify the absence of that result. And when checking for a result or checking the count of results, do something that will wait for the results to appear.
