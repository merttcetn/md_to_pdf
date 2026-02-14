import test from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES } from "../shared/templates";

test("includes four built-in templates", () => {
  assert.equal(TEMPLATES.length, 4);
  assert.deepEqual(
    TEMPLATES.map((template) => template.id),
    ["clean", "classic", "modern", "academic"]
  );
});
