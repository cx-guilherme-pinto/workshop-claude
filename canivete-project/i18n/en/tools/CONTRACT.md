# Contract of a tool (`tools/<id>/tool.js`)

Each Pocketknife tool is an ES module with an `export default` made by one of the 4 templates in `templates/`. The agent writes **only** `tools/<id>/tool.js`. The spec (`tools/<id>/spec.md`) and the test (`tools/<id>/tool.test.js`) are already there, and the interface belongs to the shell (`public/`).

```js
import { calc, ToolError } from '../../templates/calc.js';

export default calc({
  id: 'nm-01',
  title: 'X % of Y and Y is what % of X',
  inputs: [
    { name: 'x', type: 'number', label: 'X' },
    { name: 'y', type: 'number', label: 'Y' },
  ],
  run({ x, y }) {
    if (x === 0) throw new ToolError('X cannot be 0.');
    return { x_percent_of_y: Math.round(x * y) / 100, y_percent_of_x: Math.round((y / x) * 10000) / 100 };
  },
});
```

## Rules

1. **The template is the spec's:** `calc`, `convert`, `text` or `generate`, imported from `../../templates/<template>.js`.
2. **The object's fields:** `id` and `title` from the spec. `inputs` has the spec's inputs, with the same names and in the same order; copy `type`, `label` and the rest (`default`, `min`, `max`, `options`).
3. **`run` receives the inputs already read:** numbers as `number`, dates as `YYYY-MM-DD` text, lists as arrays. It returns the spec's output: a number, a text, a list or an object with the spec's fields.
4. **An input the tool does not accept:** `throw new ToolError('<the spec's message>')`. The inputs the template cannot read (empty, not a number…) already give an error by themselves, with the message from `lib/texts.js`.
5. **`generate`:** randomness comes only from the `random()` (and `randomInt(n)`) that `run` receives as its second argument. Never use `Math.random` or `crypto`: the same seed must give the same result.
6. **Forbidden:** the DOM (`document`, `window`), the network (`fetch`…), storage, `eval`, `Function`, dynamic `import()` and `import` from outside `../../templates/` and `../../lib/`.
7. **No dependencies.**

## Check

```
node --test tools/<id>/tool.test.js
```

The test checks the contract, each example of the spec, each invalid input and a safe source. Agents never change specs or tests.
