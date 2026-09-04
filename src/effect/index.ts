import { eslintCompatPlugin } from "@oxlint/plugins";

import { noUnionStateWithRule } from "./rules/no-union-state-with.ts";

/** Rules that assume Effect idioms. Opt in when the codebase uses them. */
const guardrailsEffectPlugin = eslintCompatPlugin({
  meta: { name: "guardrails-effect" },
  rules: {
    "no-union-state-with": noUnionStateWithRule,
  },
});

export default guardrailsEffectPlugin;
