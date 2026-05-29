import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSrcDoc } from "../dist/iframe/index.js";

test("camouflage override lands after model styles and suppresses white panels", () => {
  const doc = buildSrcDoc(
    `<!DOCTYPE html><html><head>
      <style>
        body{background:white!important}
        .panel{background:#fff!important;background-image:linear-gradient(#fff,#fff);color:#111}
      </style>
    </head><body><main class="shell"><section class="panel">White box</section></main></body></html>`,
    { camouflage: true, seamless: true },
  );

  assert.ok(
    doc.lastIndexOf("background-color:var(--surface") >
      doc.indexOf(".panel{background:#fff!important"),
  );
  assert.match(doc, /body :where\(main,section,article,aside,header,footer,nav,form,div\)\[class\]/);
  assert.match(doc, /body>:only-child,\s*body>:only-child\[class\]/);
});
