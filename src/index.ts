import { eslintCompatPlugin } from "@oxlint/plugins";

import { abcSizeRule } from "./rules/abc-size.ts";
import { bannedVocabularyRule } from "./rules/banned-vocabulary.ts";
import { callChainRule } from "./rules/call-chain.ts";
import { cognitiveComplexityRule } from "./rules/cognitive-complexity.ts";
import { flagArgumentRule } from "./rules/flag-argument.ts";
import { halsteadDifficultyRule } from "./rules/halstead-difficulty.ts";
import { maintainabilityIndexRule } from "./rules/maintainability-index.ts";
import { nestedMatchRule } from "./rules/nested-match.ts";
import { noCommentsRule } from "./rules/no-comments.ts";
import { participleFunctionRule } from "./rules/participle-function.ts";
import { similarFunctionsRule } from "./rules/similar-functions.ts";
import { singleUseFunctionRule } from "./rules/single-use-function.ts";
import { suspectOfSuffixRule } from "./rules/suspect-of-suffix.ts";

/** Readability rules, enforced by the linter so they fail the build instead of decaying. */
const guardrailsPlugin = eslintCompatPlugin({
  meta: { name: "guardrails" },
  rules: {
    "abc-size": abcSizeRule,
    "banned-vocabulary": bannedVocabularyRule,
    "call-chain": callChainRule,
    "cognitive-complexity": cognitiveComplexityRule,
    "flag-argument": flagArgumentRule,
    "halstead-difficulty": halsteadDifficultyRule,
    "maintainability-index": maintainabilityIndexRule,
    "nested-match": nestedMatchRule,
    "no-comments": noCommentsRule,
    "participle-function": participleFunctionRule,
    "similar-functions": similarFunctionsRule,
    "single-use-function": singleUseFunctionRule,
    "suspect-of-suffix": suspectOfSuffixRule,
  },
});

export default guardrailsPlugin;
