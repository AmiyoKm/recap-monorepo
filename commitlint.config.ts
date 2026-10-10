const ERROR = 2;
const MAX_HEADER_LENGTH = 100;

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [ERROR, "always", ["api", "web", "db", "infra", "deps", "repo", "tooling"]],
    "header-max-length": [ERROR, "always", MAX_HEADER_LENGTH],
    "subject-case": [ERROR, "always", "lower-case"],
  },
};
