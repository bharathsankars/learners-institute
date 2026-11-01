// Preloaded by `npm test`: unit tests must use stubs, never a real database.
// Pointing at a closed local port makes any unstubbed query fail instead of
// writing to the development register. dotenv does not override this value.
process.env.DATABASE_URL = "postgresql://unit-tests@127.0.0.1:1/unit_tests_must_not_connect";
