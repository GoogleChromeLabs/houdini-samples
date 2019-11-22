import {
  html,
  render
} from "https://unpkg.com/lit-html@1.1.2/lit-html.js?module";

if (location.protocol === "http:" && location.hostname !== "localhost") {
  location.protocol = "https:";
}
if (!("layoutWorklet" in CSS)) {
  document.body.innerHTML =
    'You need support for <a href="https://github.com/w3c/css-houdini-drafts/blob/master/css-layout-api/EXPLAINER.md">Layout Worklet</a> to view this demo :(';
}

CSS.layoutWorklet.addModule("layout.js");

const constraintOps = [
  "",
  "above",
  "below",
  "left-of",
  "right-of",
  "align-top",
  "align-bottom",
  "align-left",
  "align-right",
  "align-parent-top",
  "align-parent-bottom",
  "align-parent-left",
  "align-parent-right",
  "center-horizontal",
  "center-vertical"
];

const childNames = ["", "A", "B", "C", "D", "E", "F", "G"];

const queries = ["", "min-width", "max-width"];

function constraintOpHasNoDest(op) {
  switch (op) {
    case "align-parent-top":
    case "align-parent-bottom":
    case "align-parent-left":
    case "align-parent-right":
    case "center-horizontal":
    case "center-vertical":
      return true;
    default:
      return false;
  }
}

function updateRelativeStyle(constraints) {
  const str = constraints.reduce(
    (acc, { target, op, dest, query, queryLength, valid }) => {
      if (!valid) return acc;

      let queryStr = "";
      if (query !== "" && queryLength !== null) {
        queryStr = `/ ${query} ${queryLength}`;
      }

      return acc + `, ${target} ${op} ${dest} ${queryStr}`;
    },
    ""
  );
  document
    .getElementById("actual-layout")
    .style.setProperty("--relative-constraints", str);
}

const selectTmpl = (items, selected, disabled) => html`
  <select disabled="${disabled}">
    ${items.map(
      item =>
        html`${
          selected === item
            ? html`<option selected>${item}</option>`
            : html`<option>${item}</option>`
        }`
    )}
  </select>
`;

const rowTmpl = constraint => html`
  <tr class="row">
    <td>${selectTmpl(childNames, constraint.target, false)}</td>
    <td>${selectTmpl(constraintOps, constraint.op, false)}</td>
    <td>${selectTmpl(
      childNames,
      constraint.dest,
      constraintOpHasNoDest(constraint.op)
    )}</td>
    <td>/</td>
    <td>${selectTmpl(queries, constraint.query)}</td>
    <td><input min="0" step="20" type="number">px</td>
    <td><button>Remove</button></td>
    <td><span>${constraint.valid ? html`&#x2705` : html`&#x274C`}</span></td>
  </tr>
`;

const tableTmpl = constraints => html`
  <table>
    <thead>
      <td></td>
      <td>Constraint<td>
      <td>/</td>
      <td>Element Query</td>
      <td></td>
      <td></td>
      <td>Valid?</td>
    <thead>
    ${constraints.map(constraint => rowTmpl(constraint))}
    <tfoot>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td><button>Add</button></td>
    <tfoot>
  </table>
`;

let constraints = [
  { target: "", op: "", dest: "", query: "", queryLength: null, valid: false }
];

const controlsEl = document.getElementById("controls");
const sliderEl = document.getElementById("slider");
const actualLayoutEl = document.getElementById("actual-layout");

render(tableTmpl(constraints), controlsEl);

// This event listener code is amazing - please don't copy it.
controlsEl.addEventListener("change", evt => {
  const rows = document.getElementsByClassName("row");
  constraints = [];
  let changedConstraint = null;

  for (let row of rows) {
    const selects = Array.from(row.getElementsByTagName("select"));
    const [target, op, dest, query] = selects.map(
      select => select.children[select.selectedIndex].textContent
    );
    const valid = row.getElementsByTagName("span")[0].textContent === "\u2705";
    const queryLength =
      parseInt(row.getElementsByTagName("input")[0].value) || null;
    const newConstraint = { target, op, dest, query, queryLength, valid };
    if (selects.find(select => select === evt.target)) {
      changedConstraint = newConstraint;
    }
    constraints.push(newConstraint);
  }

  if (changedConstraint) {
    const noDest = constraintOpHasNoDest(changedConstraint.op);
    if (noDest) {
      changedConstraint.dest = "";
    }

    if (
      changedConstraint.target !== "" &&
      changedConstraint.op !== "" &&
      (noDest || changedConstraint.dest !== "")
    ) {
      changedConstraint.valid = true;
    }
  }

  updateRelativeStyle(constraints);
  render(tableTmpl(constraints), controlsEl);
});

sliderEl.addEventListener("change", evt => {
  const layoutChildren = Array.from(actualLayoutEl.children);
  for (let i = 0; i < layoutChildren.length; i++) {
    layoutChildren[i].style.display = i < evt.target.value ? "" : "none";
  }
});

controlsEl.addEventListener("click", evt => {
  if (evt.target.tagName !== "BUTTON") return;

  if (evt.target.textContent === "Add") {
    constraints.push({
      target: "",
      op: "",
      dest: "",
      query: "",
      queryLength: null,
      valid: false
    });
    updateRelativeStyle(constraints);
    render(tableTmpl(constraints), controlsEl);
    return;
  }

  if (evt.target.textContent === "Remove") {
    const rows = document.getElementsByClassName("row");
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].contains(evt.target)) {
        constraints.splice(i, 1);
        updateRelativeStyle(constraints);
        render(tableTmpl(constraints), controlsEl);
        return;
      }
    }
  }
});
